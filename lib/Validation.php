<?php

require_once "AException.php";

/**
Исключение валидации
*/
class ValidateException extends AException {}

function vassert($bool, $msg) {
	if(!$bool) throw new ValidateException( $msg );
}
/**
Класс валидирующий и изменяющий параметры
*/
class Validation {
	public $app;
	public $argv;
	public $key;

	public function __construct($app) {
		$this->app = $app;
	}
	
	/** Проверка параметров на валидность */
	public function valid($param_typ, &$argv) {
		$param = &$argv->param;
		$this->argv = &$argv;
		if(!$param_typ) return;
		foreach($param_typ as $key=>$type) {
			$val = $param[$key];
			//if(!isset($val)) throw new ValidateException("Не указан обязательный параметр `$key`", 401);
			$this->key = $key;
			try {
				$val = call_user_func([$this, $type], $val);
			} catch(ValidateException $e) {
				throw new ValidateException( "Параметр `$key` не соответствует своему типу `$type`".
					($e->getMessage()? ". ".$e->getMessage(): ""), 402);
			}
				
			if(isset($val)) $param[$key] = $val;	# параметр так же преобразуется к указанному типу
		}
	}
	
	function int($val) {
		vassert($val == (string) (int) $val, "должно быть целым");
		return (int) $val;
	}
	function uint($val) {
		vassert($val == (string) (int) $val && $val >= 0, "должно быть натуральным");
		return (int) $val;
	}
	function nuint($val) { return $this->uint((int) $val); }
	function double($val) { return (double) $val; }
	function string($val) { return (string) $val; }
	function bool($val) { return (bool) $val; }
	function array_v($val) {
		return is_string($val)?[$val]:(isset($val)?$val:[]);
	}
	
	function money($val) {
		vassert($val == round($val, 2), "Деньги могут иметь только 2 знака после запятой");
		return (double) $val;
	}
	
	function umoney($val) {
		$val = $this->money($val);
		vassert($val>=0, "Деньги не могут быть отрицательными");
		return $val;
	}
	
	function id($val) { 
		vassert(is_numeric($val) && $val > 0, "Идентификатор - это натуральное число больше 0");
		return (int) $val;
	}
	function password($val) {
		$len = strlen($val);
		vassert($len >= 6, "Пароль должен быть больше или равен 6 символам");
	}
	function email($val) {
		vassert(preg_match('/^[^@\s]+@([a-z0-9\-\x80-\xFF]+\.)+[a-z0-9\-\x80-\xFF]{2,}$/', $val), "Введён неверный email");
		return strtolower($val);
	}
	function phone($val) {
		vassert(preg_match('/^\+\d+\s*\(\d+\)\s*\d+(-\d+)*$/', $val), "Формат телефона: +цифры (цифры) цифры через тире. Например: +7 (921) 333-3-333");
		return str_replace([" ", "-", "(", ")"], "", $val);
	}
	function phone_z($val) {
		if(!$val) return null;
		return $this->phone($val);
	}
	function login($val) {
		try {
			return $this->email($val);
		} catch(ValidateException $e) {}
		return $this->phone($val);
	}
	function contact($val) {
		try {
			return $this->email($val);
		} catch(ValidateException $e) {}
		try {
			return $this->phone($val);
		} catch(ValidateException $e) {}
		return $this->skype($val);
	}
	function file($val) {
		vassert(is_array($val), "Это не файл");
		vassert(isset($val["Content-Disposition"]), "Это не файл");
		vassert(isset($val["Content-Disposition"]["filename"]), "Это не файл");
	}
	
	function files($val) {
		vassert(is_array($val), "Нет файлов в качестве параметра");
		if(isset($val["Content-Disposition"])) { $this->file($val); return [$val]; }
		foreach($val as $file) $this->file($file);
	}
	
	function date($val) {
		vassert($val == "" or preg_match('/^\d{4}-\d{2}-\d{2}$/', $val), "Это не дата");
		return $val;
	}
	
	function json($val) { return json_decode($val); }
	function njson($val) { $val = json_decode($val); return $val===null? []: $val; }
	
	function zero($val) { return 0; }
	
	function fio($val) { 
		vassert($val!='', "ФИО должно иметь хоть один символ");
	}
	function skype($val) { 
		vassert($val!='', "SKYPE должен содержать хоть один символ");
		return $val;
	}
	function city($val) { 
		vassert($val!='', "Название города должно быть хотя бы один символ");
	}
	function order($val) {
		vassert(preg_match('/^((\w+\.)?\w+(\s+desc)?(,(\w+\.)?\w+(\s+desc)?)*)?$/', $val), "Не соответствует формату order: поле1[ desc],поле2...");
		$val = preg_replace_callback('/\w+/', function($a) {
			if($a[0] == "desc") return "desc";
			return '"'.$a[0].'"';
		}, $val);
		return $val;
	}
	
	function order_by($val) { return " order by ".$this->order($val); }
	function norder_by($val) { return $val? $this->order_by($val): ""; }
	
	function offset($val) {
		return $this->uint($val);
	}
	function offset_by($val) { return " offset ".$this->offset($val); }
	function limit($val) {
		vassert(0 < $val and $val <= 100, "limit не может быть больше 100 и меньше 1");
		return (int) $val;
	}
	function limit_by($val) { return " limit ".$this->limit($val); }
	function nlimit10($val) { return $this->limit($val? $val: 10); }
	
	function shared($val, $to = false) {
		$key = $this->key;
		if(substr($key, 0, 3) == "own") $tab = lcfirst(substr($key, 3));
		else if(substr($key, 0, 6) == "shared") $tab = lcfirst(substr($key, 6));
		else throw new ValidateException("Имя параметра должно начинаться на shared или own");
		
		$val = $this->json($val);
		$beans = [];
		foreach((array) $val as $v)	{
			$bean = R::dispense($tab);
			$bean->import($v);
			$beans[] = $bean;
		}
		if($to) $this->argv->model->$key = $beans;
		return $beans;
	}
	
	
	function shredpro($val) {
		return $this->shared($val, true);
	}
	function event($val){
		vassert($val=='save' or $val=='erase', "Неправильно задано событие");
		return $val;
	}
	
	function lang($lang) {
		$locale = $this->app->locale;
		if(!$locale->is($lang)) return 'ru';
		return $lang;
	}
	
	function npositive($val) {
		return $this->nuint($val || 1);
	}
	
}

