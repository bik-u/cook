from Crypto.Cipher import AES
import json
import requests

key = json.loads(requests.get("https://raw.githubusercontent.com/enimax-anime/key/e6/key.txt").content)
src = "U2FsdGVkX185iv51ubYXXz9+0cQ8LGvZaufHLrggypdpsomDQqPdGUO8AW0LLjHFnJ8h99fwKzzipBt4gXKPHEuKQtDauVSDqWLBfaUCI22u1sysDKHtCs94wtUji80RQto2dDM7mDM9mc/UWhDzwFznhrSJPxyeGnb5jHyhRjex7Gt3CtBgQvXAhje8YGTrlRcqAPaCxglXJOUJsiKGXi9jKBclcmutpNzFwjCiXHCSX3eGKHup7YEajnDEcMlQdY9YA0qSm/2Qc3rCXwdQUvcJ076HBhcMPAnvY6tkpLzSslANmhveePDyPFPxqGDfJ+RKPgOVG1uQKb3MX9pdmVWkLHHD1IaemLTlmlhqdVvLe3okhwVpF2FZOJf6CuO0sm3lTeOdp+m3XcDjOB93/vRKuSrnWaAtDOJNlR13PUAYPQaV7OLOI5OFrtnJg6MCRzXJsU6oad8/+2SFcJe2IRtSYng/xXcvkCF9lZc9bYy8m2Vd333Ug==U2FsdGVkX18Sxg4y8x7FP1eIe3iPRRWIoRj+3C/DMD842i0Q61qc/IXMWnb8ujHFnJ8B3Effnm8NfhTVjVXwIY1HNYmD+nbo3TRMpaUCI22u3kF+DKHtCsIDjKFd8ritzNo2dDM7xjSdhS6CDQFOA9B44KSJPxyeTzTWK4xskcgaC6Gm789IjKSwiZtM6MpAPJIhCXWFMXUykmX2y67PuZAPnqZ9mj/FtqTIaML9aUlNeOJ0UtxjdRbwtjA5b6oBlAdN+K22Rk+UhnDDvcrdraTUbBf3ZHUR9zuM0yGDmt5+u1hIJ6TK1+WrFJTxBP5i2KSusz1SVa4072MucfSFVS0zlpz26djTbCAlUFzZNk+VnLBXvPWeWVWpsa7bwel9813SKxsWrcuWEj2EV9buUrNxRnr5u2tF6z8RartS3pkV6ZW/fMQ8mOgh26UAEgiZ2cvmoRhiaB8iAoy9ZtEdtXNhURKbaj0TEqA7Mp3uBPdpCsw405yaA==" 

src_arr = list(src)
extracted_key = ""

for i in range(len(key)):
    for j in range(key[i][0], key[i][1]):
        extracted_key+=src[j]
        src_arr[j] = ""
    
key = extracted_key
sources = "".join(src_arr)

print(key, sources)
    

cipher = AES.new(key, AES.MODE_EAX)
data = cipher.decrpt_and_verify(sources)