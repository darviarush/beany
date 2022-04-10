# -*- coding: utf-8 -*-

# Используется для перевода файлов в директории locale проекта

from selenium import selenium
import time, re, glob, sys
import os.path
import codecs
from pprint import pprint


try:
	verificationErrors = []
	selenium = selenium("localhost", 4444, "*chrome", "http://translate.google.ru/")
	selenium.start()
		
	def wait(location):
		while 1:
			text = selenium.get_text(location)
			if text and text != u"Идет перевод…": break
			time.sleep(0.1)
		return text
	

	a = sys.argv[1:2]
	b = sys.argv[2:3]
	if a and not b: b = a
	a = (a or ["0"])[0]
	b = (b or [u"М"])[0]
	print a, b

	for path in glob.glob("locale/*.po.s"):
		(head, tail) = os.path.split(path)
		(name, ext) = os.path.splitext(tail)
		(name, ext) = os.path.splitext(name)
		
		if not a<=name<=b: continue
		
		print name
		
		text = codecs.open(path, "rb", "utf-8").read()

		if name == "zh": name = "zh-TW"

		selenium.open("http://ya.ru")
		selenium.open("/#ru/"+name)
		
		selenium.type("id=source", text)
		
		text = wait("id=result_box")
		f = codecs.open(path, "wb",  "utf-8")
		f.write(text)
		f.close()
finally:
	selenium.stop()
	pprint(verificationErrors)
