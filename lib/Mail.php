<?php

/**
Класс для отправки почты
**/

require_once "lib/Template.php";

class Mail extends Template {
	
	function __construct($app) {
		$this->app = $app;
	}
	
	# загружает шаблоны из директории mail проекта
	function load() {
		$dir = opendir("mail");
		while($file = readdir($dir)) {
			$path = "mail/$file";
			if(is_file($path)) $this->parse(substr(strrchr($file, '.'), 1), file_get_contents($path));
		}
		closedir($dir);
	}
	
	# отправляет письмо из шаблона
	function send($name, $param) {
		$tmpl = $this->tmpl[$name];
		if(!$tmpl) $this->parse($name, file_get_contents("mail/$name.html"));	// загружаем шаблон
		$ini = $this->app->ini["email"];
		$param = array_merge([HOST=>$this->app->ini["server"]["host"], FROM=>$ini["from"]], $param);
		if($ini["test"]) {
			$f = fopen($ini["test_path"], "wb");
			$this->write($f, $name, $param);
		}
		else {
			$f = popen("sendmail -t", "wb");
			$this->write($f, $name, $param);
			pclose($f);
		}
	}
	
	# отправляет переданное этой функции письмо
	function mail($email, $subject, $msg, $headers) {
		$ini = $this->app->ini["email"];
		$headers = "From: ".$ini["from"];
		if($ini["test"]) {	// тест - не отправлять, а сохранить письмо
			file_put_contents($ini["test_path"], "To: $email\nSubject: $subject\n$headers\n\n$msg");
		} else {
			$ret = mail($email, $subject, $msg, $headers);
			if(!$ret) throw new AException("Письмо не отправлено", 501);
		}
		return $this;
	}

	
}
