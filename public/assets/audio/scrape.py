import urllib.request
import re

req = urllib.request.Request('https://www.epidemicsound.com/sound-effects/tracks/65b16962-4e28-4d69-8252-d9be7c3552ae/', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')
match = re.search(r'https://[^\"]+?\.mp3[^\"]*', html)
if match:
    print(match.group(0))
else:
    print('No mp3 found')
