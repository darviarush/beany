<?php

/**
Core - это плагин позволяющий взаимодействовать с ядром сайта: пользователями, сессиями и ролями
*/

require_once "lib/Model.php";

$app->cron(mktime(0, 0, 0), 60*60, function() {//удаляет сессии через 1 час 
	$time = time()-60*60;
	$arm = R::find( 'session', 'time <= ?', [$time]);
	foreach($arm as $session) {
		R::trash($session);	// удаляем сессию
	}
});


# строит массив стран и записывает в index.html для выпадающих списков
$app->bind("index.html", function($app, &$ret) {
	$ret[COUNTRY] = arrayToRows(R::getAll("select id, code, mask from country order by id"));
});


$controllers->add([
	"core/login" => [	// возвращает так же список доступных этому пользователю контроллеров
		desc => "Вход пользователя",
		access => "all",
		param => ["login"=>"login", "password"=>"password"],
		func => function($param, $args) {
			$login = strstr($param->login, '@')? "email": "phone";
			$session = Model_Session::login($login, $param->login, $param->password);
			
			$args->OUTHEAD["Set-Cookie"] = "sess={$session->hash}; path=/";
			$ret = $args->app->controllers->lightRun("login", $args, [], $session);
			$ret["name_role"] = R::getCol("select r.name name_role from role r, role_user r_u where r_u.user_id=? and r_u.role_id=r.id",[$session->user->id]);
			if($session->user->code) {
				#$session->user->code = null;	# код стирается в конце сессии
				#R::store($session->user);
				$ret["code"] = true;
			}
			return $ret;
		}
	],
	"core/logout" => [
		desc => "Выход пользователя",
		access => "all",
		param => [],
		func => function($param, $args) {
			$args->OUTHEAD["Set-Cookie"] = "sess=; expires=Friday, 31-Dec-99 23:59:59 GMT; path=/";
			if($args->session) $args->session->logout();
			return [];
		}
	],
	"core/role/load" => [
		desc => "Возращает роли для пользователя",
		access => "authall",
		func => function($param, $args) {
			$user = $args->session->user;
			$ret = R::getCol("select r.name name_role from role r, role_user r_u where r_u.user_id=? and r_u.role_id=r.id",[$user->id]);
			return $ret;
		}
	],
	"core/change_self_password" => [
		desc => "Изменить свой пароль",
		access => "authall",
		param => ["old_password"=>"password", "new_password"=>"password"],
		func => function($param, $args) {
			$user = $args->session->user;
			if($param->old_password != $user->password and $param->old_password != $user->code) 
				throw new AException("Старый пароль введён неверно", 302);
			$user->password = $param->new_password;
			$user->code = null;
			R::store($user);
			return [];
		}
	],
	"core/new_user" => [ 
		desc => "Создать новый аккаунт или восстановить пароль",
		access => "all",
		param => ["contact"=>"login"],
		func => function($param, $args) {
			$contact = $param->contact;
			$type = strstr($contact, '@')? "email": "phone";
			if (strlen($contact)) {
				$account_user = R::getRow('select us.* from "user" us, account a, type t where us.id=a.user_id and t.name = ? and a.contact=? and t.id=a.type_id', [$type, $contact]);
				if (!$account_user){
					$user = R::dispense("user");
				} else { 
					$user = R::load("user", $user["id"]);
				}
				$user->code = $password = genPasswd();
				R::store($user);
				
				if (!$account_user){	
					$account = R::dispense("account");
					$account->contact = $contact;
					$account->type = R::findOne("type","name=?",[$type]);
					$account->user = $user;
					R::store($account);
					if($type == "email"){
						// отправляем сообщение пользователю
						$args->app->mail->send("newuser", [
							TO=>$contact,
							PASSWORD=>escapeHTML($password)
						]);
					} else {
						$args->app->SMS->send($contact, $args->app->ini["server"]["host"]." Ваш временный пароль: $password");
					}
				}
				else {
					throw new AException("Такой ".$type." уже есть", 302);
				}
			}
			return [];
		}
	],
	"core/user/load" => [
		desc => "Возвращает информацию о пользователе",
		access => "auth",
		param => ["id"=>"id"],
		func => function($param, $args) {
			$ret = R::load("user", $param->id)->getInfo();
			return $ret;
		}
	],
	"core/me/load" => [
		desc => "Возвращает информацию о залогиненном пользователе",
		access => "authall",
		func => function($param, $args) {
			$email = arrayToRows(R::getAll('select a.id id, t.name "type", a.contact contact from account a, type t where a.type_id=t.id and a.user_id=? and t.name=?', [$args->session->user->id, "email"]));
			$phone = arrayToRows(R::getAll('select a.id id, t.name "type", a.contact contact from account a, type t where a.type_id=t.id and a.user_id=? and t.name=?', [$args->session->user->id, "phone"]));
			$info = $args->session->user->getMeInfo();
			$skype = is_null($info['skype']) ? [] : explode('\',\'', substr($info['skype'], 2, -2));
			$arr =[];
			foreach($skype as $key=>$value) {
				array_push($arr, ['type'=>'skype', 'contact'=>$value, 'id'=>++$key]);
			}
			return ['info' => $info, 'email' =>$email, 'phone'=>$phone, 'skype'=>arrayToRows($arr)];
		}
	],
	"core/me/store" => [
		desc => "Изменяет информацию о залогиненном пользователе",
		access => "authall",
		param => [],
		func => function($param, $args) {
			$user = $args->session->user;
			foreach($user->getMeFld() as $k) {
				$param_k = $param->$k;
				if(isset($param_k)) $user->$k = $param_k !== ""? $param_k: null;
			}
			R::store($user);
			return [];
		}
	],
	"core/me/contact/store" => [
		desc => "Добавляет или изменяет e-mail, phone, skype пользователя",
		access => "self",
		model => "account",
		param => [id=>"nuint", contact=>string, type=>string],
		func => function($param, $args) {
			$account = $args->model;
			$contact = $param->contact;
			if($contact=="") {		# удаляем
				R::trash($account);
				return [];
			}
			$type = R::findOne("type", "name=?", [$param->type]);
			if(!$type->id) throw new Exception("Такого типа аккаунта не существует");
			$validator = $type->name;
			$account->contact = $args->app->controllers->validation->$validator($contact);	//проверяем чтобы тип совпадал с типом контакта
			$account->type = $type;
			R::store($account);
			return [id=>$account->id];
			
			/*if (($str_len = strlen($param->contact)) && is_int($idx_type = array_search($type, ["email", "phone", "skype"]))){
				$val = $args->app->controllers->validation->$type($param->contact);//проверяем чтобы тип совпадал с типом контакта
			}
			if (!$str_len || $val ) {
				//Для телефонов и e-mail
				if ($type == "phone"|| $type == "email") {
				
					$count = R::getCell('select count(1) from account a, "type" t where a.contact=? and t.id=a.type_id and t.name=?',[$param->contact, $param->type]);
					if (!$count) {
						if ($id) {
							$contact = R::findOne('account', 'user_id=? and id=?',[$args->session->user->id, $param->id]);
								
							if (!$param->contact) {
								$contacts = R::getCell('select count(1) from account where user_id=?', [$args->session->user->id]);
								if ($contacts > 1) R::trash($contact); //один контакт оставляем для пользователя
								return [];
							}
						} else $contact = R::dispense("account");
							
						$type = R::findOne("type", "name=?", [$type]);
						if(!$type->id) throw new Exception("");
						$contact->type = $type;
						$contact->contact = $val;
						$contact->user = R::load('user', $args->session->user->id);
						R::store($contact);
						$id = $contact->id;
					} else {
						throw new AException("Такой пароль уже есть", 302);
					}
				}
				if($type == "skype"){ //Для skype
					$user = R::load('user', $args->session->user->id);	
					$contact = is_null($user->$type) ? [] : explode(',', substr($user->$type, 1, -1));
					if (--$id >= 0) {		
						if($param->contact) {
							$contact[$id] = "'".$param->contact."'"; //заменяем контакт
						} else {
							unset($contact[$id]);//удаляем контакт
						}
					} else {
						array_push($contact, "'".$param->contact."'");//добавляем контакт
						$id = count($contact);
					}
					$contact = implode(",", $contact);
					$contact = strlen($contact) ? "{".$contact."}": null;
					$user->$type = $contact;
					R::store($user);
					++$id;
				}
			} 
			return ["id"=>$id];*/
		}
	],
	"core/me/contact/erase" => [
		desc => "Добавляет или изменяет e-mail, phone, skype пользователя",
		access => "authall",
		param => [id=>"nuint", contact=>string, type=>string],
		func => function($param, $args) {
			$id = $args->app->controllers->lightRun("core/me/contact/store", $args, [id => $param->id, contact => $param->contact, type =>$param->type], $session);
			return $id;
		}
	]
]);
