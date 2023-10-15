from Crypto.Cipher import AES
import json
import requests
import re

data = requests.get("https://aniwatch.to/ajax/v2/episode/list/100").content
print(re.findall('data-id=\\"[0-9]+\\"', str(data)))