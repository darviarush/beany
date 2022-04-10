<?php
/**
Содержит модель приложения
*/

require_once 'rb.php';
require_once 'AException.php';

# Ошибки сессии
class SessionException extends AException {}

# Класс представляет собой сессию
class Model_Session extends RedBean_SimpleModel {
	
	# выполняется при сохранении R::store
	function update() {
		assert($this->user->id);	# проверка на пользователя
	}
	
	# выполняется перед удалением
	function delete(){
		if(is_null($this->user->code)) {
			$this->user->code = null;// проставляем в null временный пароль пользователя если сессия закончилась
			R::store($this->user);	
		}
	}
	# генерирует хеш сессии. Метод класса
	function genHash($count = 16) {
		$hash = "";
		for($i=0; $i<$count; $i++) $hash .= chr(rand(33, 126));
		$hash = str_replace([";", "\""], ":", $hash);
		return $hash;
	}
	
	# Возвращает сессию по её хешу. Метод класса
	function get($hash) {
		$ret = R::findOne("session", "hash = ?", [$hash]);
		if ($ret/*&&($ret->time+60<time())*/){
			$ret->time = time();
			R::store($ret);
		}
		return $ret;
	}
	
	# возвращает true, если пользователь залогинился и это его контрол 
	function auth($control_name) {
		if(!$this->id) return false;
		return (bool) R::getCell("select 1
		from control c
			inner join control_role r on c.id=control_id
			inner join role_user u on r.role_id=u.role_id
		where name=? and user_id=? limit 1", [$control_name, $this->user->id]);
	}
	
	# создаёт сессию на основе id пользователя. Метод класса
	function new_session($user) {
		$session = R::dispense("session");
		if(!is_object($user)) $user = R::load("user", $user);
		$session->user = $user;
		$session->hash = Model_Session::genHash();
		$session->time = time();
		R::store($session);
		return $session;
	}
	
	# логинится. Метод класса
	function login($field, $login, $password) {
		$arr = [$field, $login, $password, $password];
		$user_id = R::getCell('select distinct us.id id from "user" us, account a, type t where t.name=? and t.id=a.type_id and us.id=a.user_id and a.contact=? and (us.password = ? or us.code = ?)', [$field, $login, $password, $password]);
		$user = R::load('user', $user_id);
		if(!$user->id) throw new SessionException("Неверный логин или пароль", 301);
		return Model_Session::new_session($user);
	}
	
	# выходит
	function logout() {
		R::trash($this->bean);
		$this->bean->user_id = null;		
	}
}

# работает с картинками
class Model_Img extends RedBean_SimpleModel {
	static $prefix = "www/i/";	# путь к папке с превью и картинками
	static $wh = "140x140";#"158x158";
	static $wh1 = "640x480";
	static $wh2 = "270x250";#"216x156";
	
	# возвращает путь к папке с файлами
	function path() {
		return self::$prefix.to_radix($this->id, 62, "/");
	}
	
	# получает тело файла и сохраняет его в папку $path
	function save($body) {
		
		if(!$this->id) R::store($this->bean);
		$path = $this->path();
		# создаём путь к директории
		$paths = split("/", $path);
		$mpath = "";
		foreach($paths as $p) { @mkdir($mpath .= $p); $mpath .= "/"; }
		# преобразуем фотографию
		$real_path = $path."x.jpg";
		$preview_path = $path."0.png";
		//echo "real_path $real_path";
		file_put_contents($real_path, $body);
		# +raise 10x10
		system("convert -resize \"".self::$wh."^\" -extent ".self::$wh." $real_path $preview_path");
		system("convert -resize \"".self::$wh1.">\" -quality 73% $real_path jpg:{$path}1.jpg");
		system("convert -resize \"".self::$wh2."^\" -extent ".self::$wh2." -quality 73% $real_path jpg:{$path}2.jpg");
		@unlink($real_path);
	}
	
	# вызывается при удалении записи. Удаляет папку с фото
	function delete() {
		$path = $this->path();
		@removeDir($path);
		$paths = split("/", $path);
		array_pop($paths);
		array_pop($paths);
		while(@rmdir(join("/", $paths))) array_pop($paths);
	}
}

# пользователь
class Model_User extends RedBean_SimpleModel {
	
	# перед сохранением
	function update() {
		assert($this->phone===null || preg_match('/^\+\d+$/', $this->phone));
	}
	
	# возвращает информацию о пользователе доступную всем
	function getInfo() {
		$user = $this->bean->export();
		return fields($user, ["name"]);
	}
	
	# список филдов доступных пользователю и администратору
	function getMeFld() { return ["name"]; }
	
	# возвращает информацию о пользователе доступную только ему и администратору
	function getMeInfo() {
		$user = $this->bean->export();
		return fields($user, $this->getMeFld());
	}
	
	# возвращает список контролов доступных пользователю
/*	function get_auth_control() {
		return R::getAssoc("select c.name as name, c.id
		from role_user u
			inner join control_role r on r.role_id=u.role_id 
			inner join control c on c.id=control_id
		where user_id=?
		group by c.id", [$this->id]);
	}
	*/
	function get_control() {
		return R::getAll("select c.name as name, c.access
		from role_user u
			inner join control_role r on r.role_id=u.role_id 
			inner join control c on c.id=control_id");
	}
}