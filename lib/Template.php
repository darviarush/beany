<?php

/**
Класс для формирования страниц из шаблонов
**/

class Template {
	public $tmpl = [];		# массив шаблонов
	public $paths = [];		# пути к шаблонам
	
	function __construct($app) {
		$this->app = $app;
	}
	
	# преобразует шаблон в кеш и сохраняет в tmpl
	function parse($name, $s) {
		$param = [];
		$body = [];
		$len = strlen($s);
		$prev = 0;
		for($idx = 0; ($idx = strpos($s, '$', $idx)) !== false; $idx = $i) {	# цикл по $
			
			for($i = $idx+1; $i<$len && (ctype_alnum($c=$s[$i]) || $c=='.' || $c=='_'); $i++);	# \w+
			if($i==$idx+1) continue;	# пустой
			
			$body[] = substr($s, $prev, $idx - $prev);
			$p = substr($s, $idx+1, $i - $idx - 1);
			$p = split('\.', $p);
			$param[] = (count($p)==1? $p[0]: $p);
			$prev = $i;
		}
		$body[] = substr($s, $prev);
		$this->tmpl[$name] = [$param, $body];
	}
	
    # формирует текст из кеша шаблона и записывает его в файл
	function write($f, $name, $av) {
		fwrite($f, $this->join($name, $av));
	}
	
	# подставляет в шаблон переменные и возвращает сформированное в виде строки
	function join($name, $av) {
		if($this->app->ini["server"]["test"]) $this->reload($name);
	
		list($param, $body) = $this->tmpl[$name];

		$i = 0;
		$toend = function($begin, $end) use ($param, &$i) {
			$c = 0;
			for(; !(($p = $param[$i])==$end and $c==0); $i++) if($p == $begin) $c++; else if($p == $end) $c--;
		};
		$getval = function($a) use (&$av) {			
			$x = $av;
			if(!is_array($a)) $a = [$a];
			foreach($a as $name) {
				if($name == '') {
					if(!is_array($x)) throw new Exception("Шаблон в теле цикла используется \$".join(".", $a)."=`$x` не массив");
					$x = current($x);
				} else $x = $x[$name];
			}
			return $x;
		};
		
		$ret = "";
		for($i=0; $i<count($param); $i++) {
			$ret .= $body[$i];
			$a = $param[$i];
			if($a == "for") {						# в шаблоне есть цикл
				$p = $param[++$i];
				$arr = &$av[$p];				# массив, по которому идём в цикле
				if(!is_array($arr)) throw new Exception("В шаблон для цикла передан `$p`=`$arr` не массив");
				if(current($arr)===false) $toend("for", "end");		# пропускаем, если пуст
				else $st[] = [$i, &$arr];
			}
			else if($a == "end") {					# видим конец цикла
				$arr = &$st[count($st)-1][1];
				list($idx, $val) = each($arr);		# сдвигаем указатель
				$curr = current($arr);
				if($curr !== false) {				# на следующий круг цикла
					$i = $st[count($st)-1][0];
				} else {							# выходим из цикла
					array_pop($st);
				}
			}
			else if($a == "if") {
				if(!$getval($param[++$i])) $toend("if", "fi");	# если плохое условие - проходим до fi
			} else if($a == "fi") {}
			else {
				$ret .= $getval($a);
			}
		}
		$ret .= $body[$i];
		return $ret;
	}
	
	# загружает шаблоны из файлов
	function load($paths, $add="") {
		if(!is_array($paths)) $paths = [$paths];
		foreach($paths as $name=>$path) {
			$path = "$add$path";
			$this->parse($name, file_get_contents($path));
			$this->paths[$name] = [$path, filemtime($path)];
		}
	}

	# перегружает просроченные шаблоны
	function reload($name) {
		list($path, $mtime) = $this->paths[$name];
		$newmtime = filemtime($path);
		if($mtime < $newmtime) $this->load([$name=>$path]);
	}
	
}
