import contextlib
import io
import runpy
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

SCRIPT = str(Path(__file__).resolve().parents[1] / 'scripts' / 'configure-hub-domain.py')
INITIAL = 'FOND_HOST=fond.mid-point.co.za\nFOND_PUBLIC_URL=https://fond.mid-point.co.za\nFOND_CREDENTIALS_KEY=fixture-preserve-me\nTRAEFIK_NETWORK=root_default\nOTHER_SETTING=keep\n'

class FakePath:
    files = {}
    def __init__(self, name): self.name = name
    def __str__(self): return self.name
    def resolve(self): return self
    def __truediv__(self, child): return FakePath(self.name + '/' + str(child))
    def read_text(self): return self.files[self.name]
    def write_text(self, value): self.files[self.name] = value

class DomainConfigurationTest(unittest.TestCase):
    def run_mode(self, mode, source=INITIAL, address='93.127.186.194'):
        FakePath.files = {'/opt/fond/.env':source}
        output=io.StringIO()
        response=MagicMock(); response.__enter__.return_value.status=200
        def copy(a,b): FakePath.files[str(b)] = FakePath.files[str(a)]
        def replace(a,b): FakePath.files[str(b)] = FakePath.files.pop(str(a))
        with patch('pathlib.Path.cwd',return_value=FakePath('/opt/fond')), patch('shutil.copyfile',side_effect=copy), patch('os.replace',side_effect=replace), patch('os.chmod'), patch('socket.getaddrinfo',return_value=[(None,None,None,None,(address,443))]), patch('urllib.request.urlopen',return_value=response), patch('sys.argv',[SCRIPT,mode]),contextlib.redirect_stdout(output):
            try: runpy.run_path(SCRIPT,run_name='__main__')
            except SystemExit as error:
                if error.code != 0: raise
        return FakePath.files['/opt/fond/.env'],output.getvalue()
    def test_inspection_does_not_print_credentials(self):
        value,output=self.run_mode('inspect')
        self.assertEqual(value,INITIAL);self.assertNotIn('fixture-preserve-me',output)
    def test_prepare_preserves_current_origin_and_credentials(self):
        value,_=self.run_mode('prepare')
        self.assertIn('FOND_HOST=fond.mid-point.co.za',value)
        self.assertIn('FOND_ALIAS_HOST=midpointhub.com',value)
        self.assertIn('FOND_CREDENTIALS_KEY=fixture-preserve-me',value)
        self.assertIn('OTHER_SETTING=keep',value)
        self.assertEqual(len(FakePath.files),2)
    def test_cutover_requires_dns_and_preserves_legacy_callback(self):
        with self.assertRaisesRegex(SystemExit,'DNS is not ready'):self.run_mode('cutover',address='2.57.91.91')
        self.assertEqual(FakePath.files,{'/opt/fond/.env':INITIAL})
        value,_=self.run_mode('cutover')
        self.assertIn('FOND_HOST=midpointhub.com',value)
        self.assertIn('FOND_CALLBACK_URL=https://fond.mid-point.co.za',value)
        self.assertIn('MIDPOINT_HUB_ENABLED=true',value)
        self.assertIn('FOND_CREDENTIALS_KEY=fixture-preserve-me',value)
    def test_rollback_changes_switches_without_discarding_new_data_or_settings(self):
        source,_=self.run_mode('cutover')
        value,_=self.run_mode('rollback',source+'NEW_SETTING=retain\n')
        self.assertIn('FOND_HOST=fond.mid-point.co.za',value)
        self.assertIn('MIDPOINT_HUB_ENABLED=false',value)
        self.assertIn('NEW_SETTING=retain',value)
    def test_unknown_host_or_duplicate_settings_fail_before_writing(self):
        for source in [INITIAL.replace('FOND_HOST=fond.mid-point.co.za','FOND_HOST=wrong.example'),INITIAL+'FOND_HOST=midpointhub.com\n']:
            with self.assertRaises(SystemExit):self.run_mode('prepare',source)
            self.assertEqual(FakePath.files,{'/opt/fond/.env':source})

if __name__ == '__main__': unittest.main()
