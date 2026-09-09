with open('benford/benford_report.html', encoding='utf-8') as f:
    html = f.read()

checks = [
    ('{{exp_count:,}}', False, 'No raw template literal for sample count'),
    ('{{res_exp_d1.mad:.4f}}', False, 'No raw template literal for MAD'),
    ('{{threshold_reports', False, 'No raw template literal for cliff ratio'),
    ('109,125', True, 'Actual disbursement count rendered'),
    ('0.0114', True, 'Actual MAD value rendered'),
    ('0.48x', True, 'Actual cliff ratio rendered'),
    ('5,160', True, 'Actual danger count rendered'),
]
all_ok = True
for needle, should_exist, label in checks:
    found = needle in html
    status = 'OK  ' if found == should_exist else 'FAIL'
    if found != should_exist:
        all_ok = False
    print(f'[{status}] {label}: "{needle}" -> present={found}')

print()
print('HTML REPORT:', 'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED')
