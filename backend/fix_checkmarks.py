file_path = 'app/services/naver_selenium_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove checkmarks
content = content.replace('✓', '[OK]')
content = content.replace('✔', '[OK]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Checkmarks removed successfully!')
