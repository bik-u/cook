from Crypto.Cipher import AES

key = [[29,36],[83,90],[142,148],[152,159],[168,175]]
src = b'U2FsdGVkX18Lt+aMDqATenComOwzIAzjBqPaor5ottBeANtJPg=ZYkaKEe0zdzVItGzcXb3qrlr4quWSlwwIQSstRL'

cipher = AES.new(key, AES.MODE_EAX)
data = cipher.decrpt_and_verify(src)