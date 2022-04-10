<?php

/** Функции-утилиты для мелких манипуляций */

# функция перекодирования
function cp1251_to_utf8($s) {
    $cp1251_to_utf8_tbl = array(
        0x80 => "\xD0\x82",
        0x81 => "\xD0\x83",
        0x82 => "\xE2\x80\x9A",
        0x83 => "\xD1\x93",
        0x84 => "\xE2\x80\x9E",
        0x85 => "\xE2\x80\xA6",
        0x86 => "\xE2\x80\xA0",
        0x87 => "\xE2\x80\xA1",
        0x88 => "\xE2\x82\xAC",
        0x89 => "\xE2\x80\xB0",
        0x8A => "\xD0\x89",
        0x8B => "\xE2\x80\xB9",
        0x8C => "\xD0\x8A",
        0x8D => "\xD0\x8C",
        0x8E => "\xD0\x8B",
        0x8F => "\xD0\x8F",
        0x90 => "\xD1\x92",
        0x91 => "\xE2\x80\x98",
        0x92 => "\xE2\x80\x99",
        0x93 => "\xE2\x80\x9C",
        0x94 => "\xE2\x80\x9D",
        0x95 => "\xE2\x80\xA2",
        0x96 => "\xE2\x80\x93",
        0x97 => "\xE2\x80\x94",
        0x99 => "\xE2\x84\xA2",
        0x9A => "\xD1\x99",
        0x9B => "\xE2\x80\xBA",
        0x9C => "\xD1\x9A",
        0x9D => "\xD1\x9C",
        0x9E => "\xD1\x9B",
        0x9F => "\xD1\x9F",
        0xA0 => "\xC2\xA0",
        0xA1 => "\xD0\x8E",
        0xA2 => "\xD1\x9E",
        0xA3 => "\xD0\x88",
        0xA4 => "\xC2\xA4",
        0xA5 => "\xD2\x90",
        0xA6 => "\xC2\xA6",
        0xA7 => "\xC2\xA7",
        0xA8 => "\xD0\x81",
        0xA9 => "\xC2\xA9",
        0xAA => "\xD0\x84",
        0xAB => "\xC2\xAB",
        0xAC => "\xC2\xAC",
        0xAD => "\xC2\xAD",
        0xAE => "\xC2\xAE",
        0xAF => "\xD0\x87",
        0xB0 => "\xC2\xB0",
        0xB1 => "\xC2\xB1",
        0xB2 => "\xD0\x86",
        0xB3 => "\xD1\x96",
        0xB4 => "\xD2\x91",
        0xB5 => "\xC2\xB5",
        0xB6 => "\xC2\xB6",
        0xB7 => "\xC2\xB7",
        0xB8 => "\xD1\x91",
        0xB9 => "\xE2\x84\x96",
        0xBA => "\xD1\x94",
        0xBB => "\xC2\xBB",
        0xBC => "\xD1\x98",
        0xBD => "\xD0\x85",
        0xBE => "\xD1\x95",
        0xBF => "\xD1\x97",
        0xC0 => "\xD0\x90",
        0xC1 => "\xD0\x91",
        0xC2 => "\xD0\x92",
        0xC3 => "\xD0\x93",
        0xC4 => "\xD0\x94",
        0xC5 => "\xD0\x95",
        0xC6 => "\xD0\x96",
        0xC7 => "\xD0\x97",
        0xC8 => "\xD0\x98",
        0xC9 => "\xD0\x99",
        0xCA => "\xD0\x9A",
        0xCB => "\xD0\x9B",
        0xCC => "\xD0\x9C",
        0xCD => "\xD0\x9D",
        0xCE => "\xD0\x9E",
        0xCF => "\xD0\x9F",
        0xD0 => "\xD0\xA0",
        0xD1 => "\xD0\xA1",
        0xD2 => "\xD0\xA2",
        0xD3 => "\xD0\xA3",
        0xD4 => "\xD0\xA4",
        0xD5 => "\xD0\xA5",
        0xD6 => "\xD0\xA6",
        0xD7 => "\xD0\xA7",
        0xD8 => "\xD0\xA8",
        0xD9 => "\xD0\xA9",
        0xDA => "\xD0\xAA",
        0xDB => "\xD0\xAB",
        0xDC => "\xD0\xAC",
        0xDD => "\xD0\xAD",
        0xDE => "\xD0\xAE",
        0xDF => "\xD0\xAF",
        0xE0 => "\xD0\xB0",
        0xE1 => "\xD0\xB1",
        0xE2 => "\xD0\xB2",
        0xE3 => "\xD0\xB3",
        0xE4 => "\xD0\xB4",
        0xE5 => "\xD0\xB5",
        0xE6 => "\xD0\xB6",
        0xE7 => "\xD0\xB7",
        0xE8 => "\xD0\xB8",
        0xE9 => "\xD0\xB9",
        0xEA => "\xD0\xBA",
        0xEB => "\xD0\xBB",
        0xEC => "\xD0\xBC",
        0xED => "\xD0\xBD",
        0xEE => "\xD0\xBE",
        0xEF => "\xD0\xBF",
        0xF0 => "\xD1\x80",
        0xF1 => "\xD1\x81",
        0xF2 => "\xD1\x82",
        0xF3 => "\xD1\x83",
        0xF4 => "\xD1\x84",
        0xF5 => "\xD1\x85",
        0xF6 => "\xD1\x86",
        0xF7 => "\xD1\x87",
        0xF8 => "\xD1\x88",
        0xF9 => "\xD1\x89",
        0xFA => "\xD1\x8A",
        0xFB => "\xD1\x8B",
        0xFC => "\xD1\x8C",
        0xFD => "\xD1\x8D",
        0xFE => "\xD1\x8E",
        0xFF => "\xD1\x8F",
    );
    $tbl = $cp1251_to_utf8_tbl;
    $r = "";
    for($i = 0, $l = strlen($s); $i < $l; $i++) {
        $c = $s{$i};
        $b = ord($c);
        if($b < 128) {
            $r .= $c;
        }
        else {
            $r .= @$tbl[$b];
        }
    }
    return $r;
}

# парсит строку
function parse_cookie($cookie) {
    $cookie = explode("; ", $cookie);
	$res = [];
	foreach ($cookie as $cook) {
        list($key, $val) = explode("=", $cook, 2);
        $res[$key] = $val; #urldecode($val);
    }
	return $res;
}

# применяет указанную функцию к каждому файлу в указанном дереве каталогов
function dirtree($dir, $fn) {
	if (is_string($dir)) $dir = [$dir];
	
	if (is_array($dir[0])) $nodir = array_shift($dir);	# директории и файлы в которые не надо заходить
	else $nodir = [];
	
	while ($dir) {
        $cat = array_pop($dir);
        if (is_file($cat)) {
            if($fn($cat)===false) return;
            continue;
        }
        $d = opendir($cat);
        while ($file = readdir($d)) {
            if ($file == "." or $file == "..") continue;
            $path = "$cat/$file";
			if(isset($nodir[$path])) continue;
            if (is_dir($path)) $dir[] = $path;
            else if($fn($path)===false) return;
        }
        closedir($d);
    }
}

# удаляет рекурсивно директории
function removeDir($dir) {
	if (is_string($dir)) $dir = [$dir];
	while ($dir) {
        $path = array_pop($dir);
        $dirs = glob("$path/*");
        if (!$dirs) {
            rmdir($path);
            continue;
        }
        foreach ($dirs as $xpath) {
            if (is_file($xpath)) unlink($xpath);
            else $dir[] = $xpath;
        }
        array_unshift($dir, $path);
    }
}

# возвращает путь к каталогу картинки без /i/
function img_path($id) { return to_radix( $id, 62, '/' ); }

# переводит натуральное число в заданную систему счисления
function to_radix($n, $radix, $sep = '') {
    $x = $y = "";
    for (; ;) {
        $y = $n % $radix;
        if ($y < 10) $k = $y;
        else if ($y < 36) $k = chr($y + ord("A") - 10);
        else if ($y < 62) $k = chr($y + ord("a") - 36);
        else $k = chr($y + 128 - 62);
        $x = $k . $sep . $x;
        if (!($n = (int)($n / $radix))) break;
    }
    return $x;
}

# парсит число в указанной системе счисления
function from_radix($s, $radix) {
    $x = 0;
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $a = ord($s[$i]);
        $x = $x * $radix + $a;
        if ($a <= ord("9")) $x -= ord("0");
        else if ($a <= ord("Z")) $x -= ord('A') - 10;
        else if ($a <= ord('z')) $x -= ord('a') - 36;
        else $x -= 128 - 62;
    }
    return $x;
}

# парсит в заголовки multipart/form-data
function parse_mfd($param) {
    $param = explode("; ", $param);
    $val1 = array_shift($param);
	$x = [];
	foreach ($param as $p) {
        $z = explode("=", $p, 2);
        $val = $z[1];
        if ($val[0] == '"') $val = substr($val, 1, -1);
        $x[$z[0]] = $val;
    }
	$x[0] = $val1;
	return $x;
}

# превращает в строку javascript
function escapejs($s) {
	return str_replace(["\\", "\n", "\r", "\"", "'"], ["\\\\", "\\n", "\\r", "\\\"", "\\'"], $s);
}

# превращает в строку javascript
function escapeHTML($s) {
	return str_replace(["&", "<", ">", "\"", "'"], ["&amp;", "&lt;", "&gt;", "&quot;", "&apos;"], $s);
}

# для строки html c одинарной кавычкой
function escapequote($str) {
	#$str = str_replace();
	return str_replace(['\\', '\''], ['\\\\', '\\\''], $str);
}

# парсит multipart/form-data и возвращает массив
function parseMultipartFormData($boundary, $buf) {

    // разбиваем полученные данные
    $param = preg_split('/(^|\r\n)--' . $boundary . '(--)?\r\n/', $buf);
	
	$ret = [];
	// разбираем хеадеры и считываем параметры
	foreach ($param as $data) {
        if (!$data) continue;
        list($head, $body) = split("\r\n\r\n", $data, 2);
        $head = split("\r\n", $head);
		$heads = [];
		foreach ($head as $h) {
            list($key, $val) = split(": ", $h, 2);
            $val = parse_mfd($val);
            $heads[$key] = $val;
        }
		$heads[0] = $body;
		$cont = $heads["Content-Disposition"];
		$name = $cont["name"];
		if (count($cont) == 2 and $name) $heads = $body;
		$val = $ret[$name];
		if (isset($ret[$name])) { // если уже есть такой параметр, то создаём массив
			if (isset($val[1])) $ret[$name][] = $heads;
			else $ret[$name] = [$val, $heads];
		} else $ret[$name] = $heads;
	}
	return $ret;
}

# превращает набор записей в заголовок и набор значений
function arrayToRows($arr) {
    list($idx, $obj) = each($arr);
	if (!isset($idx)) return [];
	if ($obj instanceof RedBean_OODBBean) {
		$export = [];
		foreach ($arr as $bean) $export[] = $bean->export();
		$obj = $export[0];
		$arr = $export;
	}
	$rows = [];
	$rows[] = array_keys($obj);
	foreach ($arr as $obj) $rows[] = array_values($obj);
	return $rows;
}

# превращает набор бинов в набор строк 
# получает массив: бины, ["own|shared - свойство"|["own|shared - свойство", "own|shared - свойство"|такой-же массив, ...], ...]
function exportToRows($beans, $properties = []) {
	if (!$beans) return [];

	$arr = arrayToRows($beans);
	
	if (count($arr) == 0) return [];
	$idx = count($arr[0]);
	$k = 1;
	foreach ($beans as $bean) {
        $i = 0;
        foreach ($properties as $property) {
            if (is_array($property)) {
                $prop = array_shift($property);
                $rows = exportToRows($bean->$prop, $property);
            }
            else $rows = arrayToRows($bean->$property);
            $head = array_shift($rows);
            array_unshift($head, $property);
            $arr[0][$idx + $i] = $head;
            $arr[$k][$idx + $i++] = $rows;
        }
        $k++;
    }
	return $arr;
}

# возвращает массив только с указанными ключами
function fields($arr, $fields) {
	$a = [];
	foreach ($fields as $field) $a[$field] = $arr[$field];
	return $a;
}

# генерирует временный пароль
function genPasswd() {
    $charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    $len = strlen($charset) - 1;
    $hash = "";
    for ($i = 0; $i < 8; $i++) $hash .= $charset[rand(0, $len)];
    return $hash;
}

# считывает массив строк из файла. Если файла нет - выдаёт пустой массив. Пустые строки удаляются
function readln($path) {
    $ln = split("\n", @file_get_contents($path));
	$lines = [];
	foreach ($ln as $line) {
        $line = trim($line);
        if ($line) $lines[] = $line;
    }
	return $lines;
}

# если приходит "нулевое" значение, то выдаётся 2-е
function def($x, $y) {
    if ($x) return $x;
    return $y;
}

# формирует подзапрос к бд для списков
function prepare_get_list($table, $where, $param) {
    $where = $where ? "where " . join(" and ", $where) : "";
	if(is_array($table)) {
		$from = join("\n", $table);
		$table = $table[0];
	} else {
		$table = "\"$table\"";
		$from = $table;
	}
	return R::getCol("select $table.id from $from $where {$param->order} offset ? limit ?", [$param->offset, $param->limit]);
}

# возвращает список
function get_ids_list($ids) {
	if($ids) $x = join(",", $ids); else $x = "0";
    return "id in ($x) ";
}

# формирует запрос к бд для списков
function get_list($table, $where, $param, $values) {
    $ids = prepare_get_list($tab, $where, $param);
	if (!$ids) return [];
	$arr = R::getAll("select $values from \"$table\" where " . get_ids_list($ids) . $param->order);
	return arrayToRows($arr);
}

# сортировка по $ids
function order_ids($ids, &$arr) {
	$aro = []; $arx = [];
	foreach($arr as $ar) $arx[$ar["id"]] = $ar;
	foreach($ids as $idx=>$id) $aro[$id] = $arx[$id];
	$arr = $aro;
}

# так как json_encode сохраняет неважно, то 
function json_encode_cyr($str, $options = 0) {
    $options |= JSON_UNESCAPED_UNICODE;
    return json_encode($str, $options);
}

# отсекает расширение
function file_name($fileName) {
    return substr($fileName, 0, strrpos($fileName, '.'));
}
# возвращает расширение файла
function file_ext($fileName) {
    return substr($fileName, strrpos($fileName, '.') + 1);
}

# копирует поля бина в новый
function copy_bean($bean) {
    $export = $bean->export();
    unset($export["id"]);
    return R::dispense($bean->getMeta('type'))->import($export);
}

# модифицирует index.html - заменяет текст между комментариев
/*function insert_in_file_html($file, $id, $json) {
	$json = json_encode_cyr($json);
	$content = file_get_contents($file);
	$idt = "<!-- $id -->";
	if($id === "DATA") $s = "<script><!--\nvar data = $json\n --></script>"; else $s = "<script><!--\ndata.$id = $json\n --></script>";
	$content = preg_replace('/'.$idt.'.*?'.$idt.'/s', $idt.$idt, $content);
	$content = str_replace("$idt$idt", "$idt\n$s\n$idt", $content);
	file_put_contents($file, $content);
}
function insert_in_index_html($id, $json) {
	insert_in_file_html("www/index.html", $id, $json);
	insert_in_file_html("www/test/index.html", $id, $json);
}*/

# извлекает json из комментариев
/*function read_from_index_html($id) {
	$content = file_get_contents("www/index.html");
	if(preg_match('/<!-- '.$id.' --><script><!--\s+data.'.$id.' = (.*?)--><\/script><!-- '.$id.' -->/s', $content, $res)) return json_decode($res[1], true);
	return [];
}*/

# читает файл в формате *.po
function readlang($file) {
	$a = [pos => [], com => []];
	$st = [];
	$f = fopen($file, "rb");
	if(!$f) throw new Exception("Не открыть файл $file\n");
	for($i = 1; $s = fgets($f); $i++) {
		$s = rtrim($s);
		if($s == '') {}
		else if(preg_match('/^#:\s+([^:]+:\d+)$/', $s, $match)) $a[pos][] = $match[1];
		else if(preg_match('/^#.*$/', $s, $match)) $a[com][] = $match[0];
		else if(preg_match('/^msgid\s+"((?:\\"|[^"])*)"$/', $s, $match)) $a[msgid] = $match[1];
		else if(preg_match('/^msgstr\s+"((?:\\"|[^"])*)"$/', $s, $match)) {
			$a[msgstr] = $match[1];
			$id = $a[msgid];
			if(!isset($id)) die("Файл `$file` повреждён - нет msgid перед msgstr. Строка $i\n");
			$st[$id] = $a;
			$a = [pos => [], com => []];
		} else throw new Exception("Файл `$file` повреждён. Строка $i\n");
	}
	if(isset($a[msgid])) throw new Exception("msgid без msgstr. Строка $i\n");
	fclose($f);
	return $st;
}

# компиллирует в json po файлы
function cclang($file, $outfile) {
	$lang = readlang($file);
	$json = [];
	foreach($lang as $msgid=>$a) $json[$msgid] = $a["msgstr"];
	$json = json_encode_cyr($json);
	file_put_contents($outfile, $json);
}

# формирует для оператора SELECT, поля для сортировки по метро и районам
function get_field($list,$name_field) {
	if( $list ) {
		$name_sort = "case $name_field ";
		foreach( explode(",",$list) as $i=>$val ) {
			$name_sort .= "when ".$val." then ".$i." ";
		}
		$name_sort .= "else 9999 end";
	} 
	else
		$name_sort="0";
	return $name_sort;
}

function get_lang($argv) {		# возвращает объект языка [code=>..., id=>...]
	$lang = $argv->cookie["lang"];
	if(!$lang) {
		$r = preg_match('/\b[a-z]{2}\b/', $argv->HEAD["Accept-Language"]);
		$lang = $r? $r[0]: 'ru';
	}
	if(!$lang or $lang == 'en') return (object) ["code"=>"en", "id"=>4];
	if($lang == 'ru') return (object) ["code"=>"ru", "id"=>1];
	$bean = R::findOne("language", "code=?", [$lang]);
	return (object) ($bean->id? ["code"=>$lang, "id"=>$bean->id]: ["code"=>"en", "id"=>4]);
}

function get_lang_id($argv) {	# возвращает language_id
	return get_lang($argv)->id;
}

function add_arr_in_arr($arr1, $arr2) {			# непонятно для чего. Кто-то комментарий не поставил
	$k = 0;
	
	foreach ($arr1 as $key=>$value){
		while ($value["id"] == $arr2[$k]["id"]){
			$arr1[$key]["imgs"][] = $arr2[$k]["img_id"];
			$k++;
		}
	}
	
	return $arr1;
}

function ip2maxmind($ip) {				# переводит ip из строкового формата в формат bigint geoip maxmind.com. У нас это таблица block
	list( $o1, $o2, $o3, $o4 ) = explode('.', $ip);

	return ( 16777216 * $o1 )
		 + (    65536 * $o2 )
		 + (      256 * $o3 )
		 +              $o4;
}

function get_names_by($table, $lang, $place_id) {	// формирует списки из таблиц ссылающихся на namen metro, district
	return arrayToRows(R::getAll('select id, (select iname from namen where "'.$table.'".name_id=namen.name_id order by language_id<>? limit 1) as "name" from "'.$table.'" where place_id=? order by "name"',[$lang, $place_id]));
}

function get_name_by($table, $lang, $id) {	// возвращает имя по id. Например, для metro. Если такого языка нет, то возвращается тот, который есть
	return R::getCell('select n.iname "name" from "'.$table.'" m, namen n where m.id =? and m.name_id=n.name_id order by n.language_id<>? limit 1', [$id, $lang]);
}

function place_counter($new, $old=null) {		# уменьшает или увеличивает счётчики квартир в place и в placen
	if($new == $old) return;
	$where = "in (SELECT unnest(ARRAY[place.country_id, place.region_id, place.vicinity_id, place.city_id]) row_id FROM place WHERE place.id ";
	if($old) {		# если был город
		if(is_array($old)) $op = " in (".join(",", $old).")";
		else $op = "=".($old+0);
		R::exec("UPDATE place SET counter_realty = counter_realty-1 WHERE id $where $op)");
		R::exec("UPDATE placen SET counter_realty = counter_realty-1 WHERE id $where $op)");
	}
	if($new) {		# если будет город
		if(is_array($new)) $op = " in (".join(",", $new).")";
		else $op = "=".($new+0);
		R::exec("UPDATE place SET counter_realty = counter_realty+1 WHERE id $where $op)");
		R::exec("UPDATE placen SET counter_realty = counter_realty+1 WHERE id $where $op)");
	}
}
