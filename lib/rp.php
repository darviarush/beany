<?php

/** 
 * Реализует кеширование с помощью редиса
 */


require_once "redis.php";
 
class CachePDOStatement {

	private $sth;
	private $dbh;
	private $args = [];
	private $ret;
	
	function __construct($dbh, $sth) {
		$this->dbh = $dbh;
		$this->sth = $sth;
	}
	
	function __call($name, $args) {
		return call_user_func_array([$this->sth, $name], $args);
	}

	function bindParam($parameter, &$variable, $data_type = PDO::PARAM_STR, $length = 0, $driver_options = 0) {
		#echo "bindParam: $parameter=$variable\n";
		$this->args[] = "$parameter=$variable";
		return call_user_func_array([$this->sth, "bindParam"], func_get_args());
	}
	
	function bindValue($parameter, $value, $data_type = PDO::PARAM_STR) {
		#echo "bindValue: $parameter=$value\n";
		$this->args[] = "$parameter=$value";
		return call_user_func_array([$this->sth, "bindValue"], func_get_args());
	}
	
	function execute($in = []) {
		#echo "execute\n";
		$args = func_get_args();
		$this->ret = $this->dbh->cashe($this->sth->queryString, $this->args, function() use ($args) {
			call_user_func_array([$this->sth, "execute"], $args);
			return $this->sth->fetchAll();
		});
		return 1;
	}

	function rowCount() {
		#echo "rowCount\n";
		return count($this->ret);
	}
	
	function columnCount() {
		#echo "columnCount\n";
		return count($this->ret[0]);
	}
	
	function fetchAll($fetch_style = null, $fetch_argument = null, $ctor_args = []) {
		#echo "fetchAll\n";
		return $this->ret;
	}
}

class CachePDO extends PDO {
	public $app;
	public $redis;
	public $filename = "log/table.json";
	public $table = [];

	function __construct($app) {
		$inb = $app->ini["database"];
		parent::__construct($inb["dsn"], $inb["user"], $inb["password"]);
		$this->app = $app;
		$inb = $app->ini["redis"];
		$this->redis = new RedisServer($inb["host"], $inb["port"]);
		$this->redis->select($inb["base"]);
				
		/*
		$tables = R::$writer->getTables();
		foreach($tables as $table) {
			$columns = R::$writer->getColumns($table);
			foreach($columns as $column) if(substr($column, -3) == "_id") {
				$tab = substr($column, 0, -3);
				$this->table[$tab][] = $table;
			}
		}

		print_r($this->table);
		*/

		# временно!!!
		$this->table = [
			"armoring"=>["armoring_external_payments"], 
			"external_payments"=>["armoring_external_payments"],
			"comment"=>["comment_img"],
			"img"=>["comment_img", "img_realty"],
			"realty"=>["img_realty"],
			"control"=>["control_role"],
			"role"=>["control_role", "role_user"],
			"user" => ["role_user"],
			"language" => ["language_rp5"],
			"rp5" => ["language_rp5"],
		];
	}
	
	function prepare($sql, $opt = []) {
		#echo "prepare $sql\n";
		$sth = new CachePDOStatement($this, parent::prepare($sql, $opt));
		return $sth;
	}
	
	function query($sql) {
		#echo "query $sql\n";
		echo "query";
		return $this->cashe($sql, [], function() use ($sql) { return parent::query($sql); });
	}
	
	function exec($sql) {
		//echo "exec $sql\n";
		return $this->cashe($sql, [], function() use ($sql) { return parent::exec($sql); });
	}
	function clear_cash($tab_name){
		$redis = $this->redis;
		$redis->del($tab_name);
		$keys = array_merge($redis->keys("$tab_name:*"), $redis->keys("*:$tab_name:*"), $redis->keys("*:$tab_name"));
		foreach($keys as $key) $redis->set($key, microtime(true));
	}

	
	function create_index($tab, $index) {
		$field = preg_replace('/(\W+)/', "_", $index);
		$name = "{$tab}_{$field}_idx";
		try { $this->exec("CREATE INDEX $name on $tab (".$index.");"); } catch(Exception $e) {
			if(!strchr($e->getMessage(), "SQLSTATE[42P07]: Duplicate table")) throw $e;
		}
	}
	
	# создаёт правило
	/*function create_rule($tab, $event, $body, $where) {		
		if (is_array($body)){
			$str_body = "(";
			foreach($body as $value) {
				preg_match('/^\s*(update|insert\s+into|delete\s+from)\s+"?(\w+)/i', $value, $arr);
				$str_body .= $value."; "; 
			}
			$body = $str_body.")";
		} else {
			preg_match('/^\s*(update|insert\s+into|delete\s+from)\s+"?(\w+)/i', $body, $arr);
		}
				
		if ($where) $where = "WHERE $where";
		$ch_tab = $arr[2];
		$name = "{$tab}_{$ch_tab}_{$event}_rule";//название роли
		
		try { $this->exec("CREATE RULE $name AS ON $event TO $tab $where DO $body;"); } catch(Exception $e) {
			if(!strchr($e->getMessage(), "SQLSTATE[42710]: Duplicate object")) throw $e;
		}
		
		$table = json_decode(file_get_contents($this->filename), true);
		
		if (count($table)) {
			if(!in_array($ch_tab, $table[$tab])) $table[$tab][] = $ch_tab;
		}
		else $table[$tab][] = $ch_tab;
		
		if (count($table)) {
			file_put_contents($this->filename, json_encode($table));	# добавляем
			$this->table = $table;
		}
	}*/
	
	# запрос alter table
	function alter_table($tab, $body){
		try { $this->exec("alter table $tab $body");} catch(Exception $e) {
			throw $e;
		}
	}
	
	# возвращает таблицы из запроса
	function get_tables($sql) {
		preg_match_all("/[()]/", $sql, $m, PREG_OFFSET_CAPTURE);	# получаем смещения скобок
		$m = $m[0];
	
		$c = 0;		# уровень в скобках
		$text = [];	# текст по уровням
		$prev = 0;	# предыдущий pos
		
		foreach($m as $x) {
			list($sk, $pos) = $x;
			
			$text[$c] .= substr($sql, $prev, $pos-$prev)."#";
			
			if($sk == "(") $c++;
			else $text[$c--] .= "\v";
			
			$prev = $pos+1;
		}
		
		$text[0] .= substr($sql, $prev);
		
		#echo "text=".print_r($text, true);
		
		$tables = [];
		foreach($text as $t) {
			preg_match_all("/\b(from\b.*?)(?:\bgroup\b|\border\b|\v|$)/is", $t, $m);	# отбрасываем group и order
			$m = $m[1];
			#echo "m=".print_r($m, true);
			
			
			foreach($m as $from) {	# ищем таблицы
				preg_match_all('/(?:\bfrom|\bjoin|,)\s+"?(\w+)/i', $from, $tab);
				$tab = $tab[1];
				$tables = array_merge($tables, $tab);
			}
		}
		$tables = array_unique($tables);
		sort($tables);
		return $tables;
	}
	
	/**
	 * Кеширование. Алгоритм
	 * 1. Считываем metakey (таблицы участвующие в запросе через ":" и отсортированные по алфавиту). Получаем время
	 * 2. Считываем key (md5 запроса с параметрами). Получаем json ответа на запрос и время, когда был сделан запрос
	 * 3. Если время запроса не совпадает с временем metakey, то выполняем запрос и меняем значения всех metakey содержащих таблицу и key. Иначе используем кеш
	 */
	function cashe($sql, $args, $fn) {		# кеширование
		if(preg_match('/^\s*\(?\s*select\b/i', $sql)) {
		
			$tab = self::get_tables($sql);
			#preg_match_all('/(?:\bfrom|\bjoin)\s+"?(\w+)/i', $sql, $tab);
			#$tab = $tab[1];
			
			if(!$tab) return $fn($sql, $args);
			if(substr($tab[0], 0, 3) == "pg_") return $fn($sql, $args);
			if($tab[0] == "information_schema") return $fn($sql, $args);
			
			$metakey = join(":", $tab);
			#print "metakey=`$metakey`\n";
			$redis = $this->redis;
			$time = $redis->get($metakey);
			#print "time=$time\n";
			if($time) {
				$key = md5($args? $sql.":".join(":", $args): $sql);
				$ret = $redis->get($key);
				#print "$metakey.$key\n";
				$get = json_decode($ret, true);
				#print "mk: $metakey=$time > {$get[0]} $key\n";
				if($get && $time < $get[0]) return $get[1];
			}
			$ret = $fn($sql, $args);	# нужно выполнить запрос
			#print "--->\n";
			$redis->set($key, json_encode_cyr([microtime(true), $ret]));
			if(!$time) $redis->setnx($metakey, microtime(true));
			return $ret;
		}

		if(!preg_match('/^\s*(update|insert\s+into|delete\s+from|alter\s+table|create\s+table|create\s+index\s+\w+\s+on|copy)\s+"?(\w+)|set|create\s+type|create\s+rule/i', $sql, $tab)) {
			echo $s = "rp.php: Неизвестный модифицирующий sql-запрос! $sql";
			throw new Exception($s);
		}

		if($tab = $tab[2]) {
			//echo "delete $tab\n";
			if (count($this->table))
				foreach ($this->table as $key => $value)	// для таблиц на которых есть rule
					if($tab == $key)
						foreach($value as $val)	{
							//echo "del_rule $val\n";
							$this->clear_cash($val);
						}
			$this->clear_cash($tab);
		}

		return $fn($sql, $args);
	}
	
	# очищает базу редиса
	function casherem() { $this->redis->flushdb(); }
}