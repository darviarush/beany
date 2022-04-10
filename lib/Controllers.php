<?php
require_once "AException.php";
require_once "Validation.php";
require_once "Utils.php";
require_once "Link.php";

/**
Менеджер контроллеров: содержит контроллеры и запускает их 
*/

class Controllers extends Link {
	public $app;				# ссылка на экземпляр приложения
	public $controllers = [];	# список контроллеров
	public $validation;			# объект для валидации
	public $tableInfo;			# информация о таблицах бд
	public $refInfo;			# ассоциативный массив. Ключи - таблицы для которых есть справочники
	public $menuInfo;			# ключ - меню, значение - справочник
	public $menu = [];			# меню
	public $menuAllUser;
	public $menuAdmin;
	
	
	/** Конструктор регистрируется в приложении */
	public function __construct($app) {
		$app->controllers = $this;
		$this->app = $app;
		$this->validation = new Validation($app);
	}
	
	/** Получает список таблиц и их столбцов для импорта в модели */
	public function getTableInfo() {
		$tables = R::$writer->getTables();
		$res = [];
		foreach($tables as $table) {
			$res[$table] = R::$writer->getColumns($table);
		}
		$this->tableInfo = $res;
		return $res;
	}
	
	/** Добавляет контролы. Предназначен для плагинов */
	public function add($controllers) {
		foreach($controllers as $name=>$control) {
			if($this->controllers[$name]) $this->app->log("Контроллер `$name` был уже добавлен. Переписываю");
			$control["name"] = $name;
			$this->controllers[$name] = $control;
		}
	}
	
	/** Подсчитывает контрольную сумму контроллера */
	function crc($con) {
		return crc32($con["name"]) ^ crc32($con["desc"]) ^ crc32($con["access"]) ^ crc32(json_encode_cyr($con["param"]));
	}
	
	/** Синхронизирует список контролов с базой, проставляет контролам id */
	public function sync() {
		$controllers = $this->controllers;

		$role = R::findOne('role', 'name=?', ['Администраторы']);
		if(!$role->id) {
			$role = R::dispense("role");
			$role->name = "Администраторы";
			R::store($role);
			$user = R::dispense("user");
			#$user->email = "admin@".$this->app->ini["server"]["host"];
			$user->password = "qwerty";
			$user->sharedRole[] = $role;
			R::store($user);
			$account = R::dispense("account");
			$account->contact = "a@a.aa";
			$account->type = R::dispense("type");
			$account->user = $user;
			R::store($account);			
		}
		
		$allcrc = 0;
		foreach($controllers as $name=>$con) {
			$crc = self::crc($con);
			$controllers[$name]["crc"] = $crc;
			$allcrc ^= $crc;
		}
		
		$crc = R::getCell("select val from constants where id=2");
		if($crc === $allcrc) return;
		R::exec("update constants set val=? where id=2", [$allcrc]);
		
		$control = R::getAssoc("select crc, id from control");
		
		$ass = [];
		foreach($controllers as $name=>$con) {
			$crc = $con["crc"];
			$id = $control[$crc];
			if($id) unset($control[$crc]);
			else $ass[$name] = $con;
		}
	
		$conid = [];
		foreach($control as $crc=>$id) $conid[$id] = $crc;
		
		foreach($ass as $name=>$con) {
			$control = R::findOne("control", "name=?", [$name]);
			$id = $control->id;
			if($id) {
				unset($conid[$id]);
			} else {
				$control = R::dispense("control");
				$control->name = $name;
			}
			$control->desc = $con["desc"];
			$control->access = $con["access"];
			$control->param = json_encode_cyr($con["param"]);
			$control->crc = $con["crc"];
			$control->sharedRole[] = $role;
			R::store($control);
			
			$this->controllers[$name]["control_id"] = $id;
		}
		
		if($conid) R::exec("delete from control where id in (".join(",", array_keys($conid)).")");
	}
	
	# устанавливает бины контролов
	function initModel() {
		foreach(R::find("control") as $bean) $this->controllers[$bean->name]["control"] = $bean;
	}
	
	# переводит набор бинов в структуру отправляемую клиенту. Класса
	function translateResponse($beans) {
		$rows = [[]];
		foreach($beans as $bean) {
			$bean = $bean->export(); // переводим запись в массив
			$row = [];
			foreach($bean as $val) $row[] = $val;
			$rows[] = $row;
		}
		$row = [];
		foreach((array) $bean as $key=>$val) $row[] = $key;
		$rows[0] = $row;
		return $rows;
	}
	
	# ищет контроллер
	public function find(&$argv) {
		list($empty, $prefix, $name) = split("/", $argv->url, 3);
		$control = $this->controllers[$name];
		if(!isset($control)) throw new AException("Контроллер `$name` не найден", 100);

		$argv->app = $this->app;
		$argv->controller = $control;
		$argv->controller_name = $name;
		
		return $control;
	}
	
	# проверяет доступ. Возвращает сессию
	public function access(&$argv) {
		$sess = $argv->cookie["sess"];
		$session = $argv->session = Model_Session::get($sess);
		
		if($sess && !$session->id) { # если есть хеш сессии, но сессии нет, то ставим куки на удаление
			$argv->OUTHEAD["Set-Cookie"] = "sess=; expires=Friday, 31-Dec-99 23:59:59 GMT; path=/";
		}
	
		$name = $argv->controller_name;
		$access = $argv->controller["access"];
		$model = $argv->controller["model"];
		if(isset($model)) {				# загружаем или создаём модель
			
			# получаем поле пользователя к которому привязана модель
			$user = $argv->controller["user"];
			if(!isset($user)) $user = ["user"];
			elseif(is_string($user)) $user = [$user];
			
			# загружаем или создаём модель
			$id = $argv->param["id"];
			$table = $model;
			if($id) {
				$model = R::load($table, $id);
			} else {
				$model = R::dispense($table);
			}
			
			# отбрасываем все параметры не являющиеся столбцами таблицы
			$cols = $this->tableInfo[$table];
			$param = [];
			foreach($argv->param as $key=>$val) if(isset($cols[$key])) {
				//$model->$key = strlen($val) == 0 && substr($key, -3) == "_id"? null: $val;
				$model->$key = $val===''? null: $val;
			}
			$argv->model = $model;
		}
		
		if($access != "all") {
			# авторизация
			if($session->id and $access == "noauth")
				throw new AException("Пользователь аутентифицирован", 201);
			
			if(!$session->id) $this->logout();
			
			if($access == "authall") {}
			elseif($access == "self") {
				$user_ref = $user[0];
				if(!$model->id) {	# сохраняем user_id для access == "self"
					$model->$user_ref = R::load($user_ref, $argv->param[$user_ref."_id"]);
				}
				$bean = $model;

				foreach($user as $user_ref) $bean = $bean->$user_ref; 
				$user_id = $bean->id;
				
				if(!$model->id and !$user_id and count($user)==1) { # перекрываем пользователя текущим
					//$user_ref = $user[0];
					$model->$user_ref = $session->user;
				} else if($user_id != $session->user->id) throw new AException("Попытка изменения чужой модели", 201);
			}
			elseif($access == "auth") {	# аутентификация
				if(!$session->auth($name)) throw new AException("Нет прав на контроллер `$name`", 300);
			}
			else throw new Exception("Неведомый доступ `$access` в контроллере `$name`");
		}
	}
	public function logout() {
		throw new AException("Пользователь не аутентифицирован", 200, [fn => 'app.auth.auth_window']);
	}
	
	/** Запускает контрол */
	public function controllerRun(&$argv) {
		$control = $this->find($argv);		// находим контрол
		$this->access($argv);				// проверяем доступ
		$this->validation->valid($control["param"], $argv);	// валидация полученных параметров
		
		// реализация логики запроса посредством модели, файлов и т.д. Установка кук
		$func = $control["func"];
		if(isset($func)) {
			$ret = $func((object) $argv->param, $argv);
			
			// если получили бины - переделываем
			if(is_array($ret)) {
				list($key, $val) = each($ret);
				if($val instanceof RedBean_OODBBean) $ret = Controllers::translateResponse($ret);
			} else if($ret instanceof RedBean_OODBBean)	$ret = $ret->export();	
		}

		// возврат данных
		return $ret;
	}
	
	# для вызова контроллера из другого контроллера
	public function lightRun($url, &$old, $param = [], $session = null) {
		$argv = clone $old;
		$argv->url = "/api/$url";
		$argv->param = (array) $param;
		if($session) $argv->cookie["sess"] = $session->hash;
		$ret = $this->controllerRun($argv);
		$old->OUTHEAD = $argv->OUTHEAD;
		$old->F = $argv->F;
		return $ret;
	}
	
	# для вызова контроллера из шаблона
	function urlRun($url, $argv) {
		$argv->url = $url;
		$ret = $this->run($argv);
		return $ret;
	}
	
	# запускает контрол и обрабатывает ошибки
	public function run($argv) {
		NEWRUN:
		try {
			$ret = $this->controllerRun($argv);
			if(is_string($ret)) return $ret; # Если возвращена строка, то она должна быть отправлена без преобразования в json
			return $this->link($ret, $argv); # возврат шаблона
		} catch(Exception $e) {
			if($e instanceof RedBean_Exception_SQL) { // ошибка sql
				try {
					R::getCell("select 1"); // ping
				} catch(Exception $e) {	// пинг не прошёл
					R::close();
					$this->app->init();	// подключаемся к базе заново
					if($respavn++ == 2) goto NEWRUN; // 2-й раз не смогли восстановить пинг - выдаём ошибку, иначе запускаем контроллер ещё раз
				}
			}
			$test = $this->app->ini["server"]["test"];
			$argv->OUTHEAD["Content-Type"] = "text/plain; charset=utf-8";
			$argv->HTTPOUT = "403 Forbidden";
			$message = $e->getMessage();
			$ret = [
				error => 599,
				message => $message,
				code => $e->getCode(),
				'class' => get_class($e),
				trace => $test? $e->getTraceAsString(): ""
			];
			if ($e instanceof AException) {
				$ret["error"] = $e->getCode();
				if($e->getData()) {$ret["data"] = $e->getData();}
			}
		}
		
		# не записываем в протокол, что там пользователь посмотрел
		/*$model = $argv->controller["control"];
		if($model) if(strrchr($argv->url, "/load") != "/load") {
			$protocol = R::dispense("protocol");
			$protocol->control = $model;
			if($user = $argv->session->user) $protocol->user = $user;	# если нет - записываем свой
			$protocol->param = json_encode_cyr($argv->param);
			$protocol->status = $message;
			$protocol->modtime = strftime('%F %T');
			R::store($protocol);
		}*/
		
		return json_encode_cyr($ret);
	}
	
	# возвращает все собственные контроллеры
	function get_self_control() {
		$controllers = [];
		foreach($this->controllers as $name => $control) {
			$access = $control["access"];
			if(in_array($access, ["self", "authall", "all"])) $controllers[$name] = $control["control"]->id;
		}
		return $controllers;
	}
	
	# добавляет контроллеры для справочника на основе шаблона (массива)
	function ref($refs) {

		$allow_op = ["like"=>1, "not like"=>1, "="=>1, "<>"=>1, "~"=>1, "!~"=>1, "~*"=>1, "!~*"=>1, "is null"=>0, "is not null"=>0, "=*"=>1, "<>*"=>1];
		foreach($refs as $url=>$ref) {
			if($url == "cach") echo "url=$url ";
			$ref["url"] = $url;
			$model = $ref["model"]; if(!$model) $ref["model"] = $model = $url;			# таблица
			$access = $ref["access"]; if(!$access) $access = "auth";
			$user = $ref["user"]; if(!$user) $user = ["user"];
			$menu = $ref["menu"];
			$name = join(" → ", $menu);
			$domain = $ref["domain"];
			
			$this->refInfo[$url] = $ref;
			$this->menuInfo[$name] = $ref;
			
			$gsel = [];
			$gjoin = ["\"$model\""];
			$sel = [];
			$join = ["\"$model\""];
			$user0 = 0;
			foreach($domain as $dom) {
				$n = $dom["name"];							// имя столбца справочника
				$col = $dom["col"];							// имя свойства таблицы
				$r = $dom["ref"];							// имя таблицы
				$u = $dom["tab"]? $dom["tab"]: $model;		// имя таблицы с столбцом
				if($r) {
					$join[] = "left join \"$r\" t_$n on \"$u\".{$n}_id=t_$n.id";
					$sel[] = "t_$n.id as {$n}_id";
					$c = $col? $col: "t_$n.name";	# значение столбца
				} else {
					$c = $col? $col: "\"$u\".\"$n\"";	# значение столбца
				}
				$sel[] = "$c as \"$n\"";
				
				if($user[0] == $r) { $user0 = 1; $gjoin[] = $join[count($join)-1]; $r = 0; }
				$group = $dom["group"];		// групповые операции выводятся в футере
				if(isset($group)) {
					if($r) $gjoin[] = $join[count($join)-1];
					$gsel[] = "$group($c) as \"$n\"";
				}
			}

			$sel_load = "select ".join(",", $sel)." from ".join("\n", $join)." where \"$model\".";
			
			if($access == "self") {		// подключаем к запросу необходимые таблицы
				if($user0) {
					$u = $user[0];
					$i = 1;
				} else {
					$u = $model;
					$i = 0;
				}
				
				for(; $i<count($user)-1; $i++) {
					$n = $user[$i];
					$join[] = $gjoin[] = "left join \"$n\" t_$n on \"$u\".{$n}_id=t_$n.id";
					$u = $n;
				}
			}
			
			$sel = "select ".join(",", $sel)." from ".join("\n", $join)." where \"$model\".";
			if($gsel) $gsel = "select ".join(",", $gsel)." from ".join("\n", $gjoin)." ";


			$info_load = function($param, $argv) use ($ref) { return $ref; };
			
			$list_load = function($param, $argv) use ($model, $domain, $sel, $join, $gsel, $allow_op, $access, $user) {
				$where = [];
				if($access == "self") {
					$count = count($user);
					$where[] = ($count==1? "\"$model\"": "t_".$user[$count-2]).".".$user[$count-1]."_id=".$argv->session->user->id;
				}
				
				foreach($param->filter as $key=>$val) {
					$op = $val[0];
					$val = $val[1];
					$res = $allow_op[$op];
					if(!isset($res)) throw new Exception("Оператор `$op` для фильтра `$key` не разрешён");
					$w = '';
					if($op == "like" || $op == "not like") $val = "'%".addslashes($val)."%'";
					else if($op == "=*" || $op == "<>*") {
						$val = '"'.addslashes($val).'"';
						$op = substr($op, 0, strlen($op)-1);
					}
					else if(!$res) $val = '';
					else $val = "'".addslashes($val)."'";
					
					$where[] = "\"".addslashes($key)."\" $op $val";
				}

				$ids = prepare_get_list($join, $where, $param);
				if(!$ids) return [];
				
				$arr = R::getAll($sel.get_ids_list($ids).$param->order);
				if($gsel) {
					list($key, $val) = each($arr);
					$x = R::getRow($gsel.($where? "where ".join(" AND ", $where): ""));
					$row = [];
					foreach($val as $k=>$v) $row[] = $x[$k];
					$arr[] = $row;
				}
				
				return arrayToRows($arr);
			};
		
			$load = function($param, $argv) use ($sel_load) {
				return R::getRow("$sel_load id=?", [$param->id]);
			};
			
			$store = function($param, $argv) {
				R::store($argv->model);
				return [id=>$argv->model->id];
			};
			
			$erase = function($param, $argv) {
				R::trash($argv->model);
				return [];
			};
			
			$this->add([
				"$url/info/load" => [
					desc => "Список строк справочника «$name»",
					access => $access,
					model => $model,
					user => $user,
					param => [],
					func => $info_load
				],
				"$url/list/load" => [
					desc => "Список строк справочника «$name»",
					access => $access=="self"? "authall": $access,
					param => [offset => "offset", limit => "limit", order => "order_by", filter=>"json"],
					func => $list_load
				],
				"$url/load" => [
					desc => "Строка справочника «$name»",
					access => $access,
					user => $user,
					model => $model,
					param => ["id" => "id"],
					func => $load
				],
				"$url/store" => [
					desc => "Сохранение строки справочника «$name»",
					access => $access,
					user => $user,
					model => $model,
					param => [],
					func => $store
				],
				"$url/erase" => [
					desc => "Удаление строки справочника «$name»",
					access => $access,
					user => $user,
					model => $model,
					param => ["id" => "id"],
					func => $erase
				]
			]);
			
		}
		$this->get_menu_control($this->menuInfo);
	}

	function get_menu_control($menuInfo){
	
		$control = R::getAll("select c.name as name, c.access
		from role_user u
			inner join control_role r on r.role_id=u.role_id 
			inner join control c on c.id=control_id");
			
		$a = $b = [];
		
		foreach($control as $key=>$value){
			$control_access[$value["name"]] = $value["access"];
		}

		foreach($menuInfo as $key => $value) {
			$url = $value["url"]."/info/load";
			if (isset($value["access"]))
				$a[$value["url"]] = explode(" → ",$key);
			else
				$b[$value["url"]] = explode(" → ",$key);
		}
		$this->menuAllUser = $a;
		$this->menuAdmin = $b;
	}

	# создаёт справочники для таблиц у которых нет ещё справочников
	function buildref() {
		$ref = [];
		foreach($this->tableInfo as $table => $fields) {
			if($this->refInfo["ref_$table"]) continue;
			$domain = [];
			foreach($fields as $field => $type) {
				array_unshift($domain, [name => $field, title => $field]);
			
				if(substr($field, -3) == "_id") {
					$fld = substr($field, 0, -3);
					$info = $this->tableInfo[$fld];
					if(isset($info)) if($info["name"]) {
						$dom = [name => $fld, ref => $fld, title => $fld];
						array_unshift($domain, $dom);
					}
				}	
			}
			$ref["ref_$table"] = [menu => ["Таблицы", $table], model => $table, domain=>$domain];
		}
		$this->ref($ref);
	}
	
}