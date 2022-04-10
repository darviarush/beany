<?php 

# Скрипт для выполнения нехитрых команд

list($app, $cmd, $name, $name2, $name3) = $argv;

$use = "Введите: app help\n";
if(!$cmd) die($use);

$desc[] = "lang - обновляет файлы переводов";
if($cmd == "lang") {
	param_count(0);
	pcntl_exec("/usr/bin/env", ["perl", "script/lang.pl"]);
	exit;
}

$desc[] = "langtr [от] [до] - переводит файлы locale/*.po.s";
if($cmd == "langtr") {
	param_count(0, 2);
	$av = ["python", "script/translate.py"];
	if($name) $av[] = $name;
	if($name2) $av[] = $name2;
	pcntl_exec("/usr/bin/env", $av);	
	exit;
}

$desc[] = "langins [язык] - каждую строку locale/*.po.s записывает в locale/*.po msgstr";
if($cmd == "langins") {
	param_count(0, 1);
	$av = ["perl", "script/insert.pl"];
	if($name) $av[] = "locale/$name.po";
	pcntl_exec("/usr/bin/env", $av);
	exit;
}

$desc[] = "langcc - компиллирует файл перевода в www/locale/*.json";
if($cmd == "langcc") {
	param_count(0);
	require_once "lib/Utils.php";
	foreach(glob("locale/*.po") as $path) {
		$outpath = "www/".file_name($path).".json";
		cclang($path, $outpath);
	}
	//foreach(glob("locale/*/*.po") as $po) { $mo = $po; $mo[strlen($mo)-2] = 'm'; system("msgfmt $po -o $mo"); }
	exit;
}

$desc[] = "theme файл/дир. [каталог] - копирует файл или директорию во все темы";
if($cmd == "theme") {
	param_count(1, 2);
	include_once "lib/Utils.php";
	$dirs = array_filter( glob("www/theme/*"), "is_dir");
	$base = is_file($name)? dirname($name): $name;
	$base = $base=="."? 0: strlen($base);
	dirtree($name, function($f) {
		global $dirs, $base, $name2; 
		$p = substr($f, $base);
		foreach($dirs as $dir) copy($f, "$dir/$name2/$p"); 
	});
	exit;
}

$desc[] = "casherem - очищает кеш";
if($cmd == "casherem") {
	param_count(0);
	plugins()->app->pdo->casherem();
	exit;
}

$desc[] = "controllers - количество контроллеров";
if($cmd == "controllers") {
	param_count(0);
	echo count(plugins()->app->controllers->controllers)."\n";
	exit;
}

$desc[] = "place маска - город, страна и т.д. из базы. Маска - название. Можно использовать % - несколько символов и _ - один символ";
if($cmd == "place") {
	param_count(1);
	$name = str_replace("'", "\\'", $name);
	$sql = "select 
(select name from placen where place_id=country_id order by language_id<>1, language_id<>4 limit 1) as \"Страна\",
(select name from placen where place_id=region_id order by language_id<>1, language_id<>4 limit 1) as \"Регион\",
(select name from placen where place_id=vicinity_id order by language_id<>1, language_id<>4 limit 1) as \"Район\",
(select name from placen where place_id=city_id order by language_id<>1, language_id<>4 limit 1) as \"Город\",
place.id as id, country_id as cid, region_id as rid, vicinity_id as vid, city_id as iid
from place inner join placen on place_id=place.id where lower(name) like lower('$name')";
	plugins();	// создаём подключение
	$row = R::getRow($sql);
	echo join("\t", array_keys($row))."\n";
	echo join("\t", array_values($row))."\n";
	exit;
}

$desc[] = "killphp - устраняет все процессы php";
if($cmd == "killphp") {
	param_count(0);
	$cmd = <<<'END'
ps A | grep php | perl -e '/\w+/, print(STDERR "$& $_"), kill(9, $&) while <STDIN>'
END;
	system($cmd);
	exit;
}


$desc[] = "pl имя - создаёт плагин на основе папки skel";
if($cmd == "pl") {
	param_count(1);
	$plugins = plugins();
	$plugins->create($name);
	$plugins->install($name);
	exit;
}

$desc[] = "pls - список установленных плагинов";
if($cmd == "pls") {
	param_count(0);
	$plugins = plugins();
	foreach($plugins->getNames() as $name) {
		$dep = join(", ", $plugins->getDepend($name));
		$fromdep = join(", ", $plugins->getDependFrom($name));
		if($fromdep) $fromdep = "\t\t<= $fromdep";
		if($dep) $dep = "\t\t-> $dep";
		echo "$name$dep$fromdep\n";
	}
	exit;
}

$desc[] = "pll - список всех плагинов";
if($cmd == "pll") {
	param_count(0);
	$plugins = plugins();
	$pl = [];
	foreach($plugins->getNames() as $name) $pl[$name] = 1;
	foreach(scandir("plugin") as $s) {
		if($s == "." || $s == "..") continue;
		$dep = join(", ", $plugins->getAllDepend($s));
		$fromdep = join(", ", $plugins->getAllDependFrom($s));
		if($fromdep) $fromdep = "\t\t<= $fromdep";
		if($dep) $dep = "\t\t-> $dep";
		echo ($pl[$s]? "i": " ")."\t$s$dep$fromdep\n";
	}
	exit;
}


$desc[] = "pli имя - инсталлирует плагин";
if($cmd == "pli") {
	param_count(1);
	$plugins = plugins();
	$depend = $plugins->getDepend($name);
	if($depend) {
		if(!confirm("$name зависит от ".join(", ", $depend).". Инсталлировать их все?")) exit;
		foreach($depend as $dep) $plugins->install($dep);
	}
	$plugins->install($name);
	exit;
}

$desc[] = "plu имя - деинсталлирует плагин";
if($cmd == "plu") {
	param_count(1);
	$plugins = plugins();
	$depend = $plugins->getDependFrom($name);
	if($depend) {
		if(!confirm("От $name зависят ".join(", ", $depend).". Деинсталлировать их все?")) exit;
		foreach($depend as $dep) $plugins->uninstall($dep);
	}
	$plugins->uninstall($name);
	exit;
}

$desc[] = "pldel имя - физически удаляет плагин";
if($cmd == "pldel") {
	param_count(1);
	if(!file_exists("plugin/$name") and !file_exists("www/plugin/$name")) echo "Плагин `$name` не существует\n";
	elseif(confirm("Удалить плагин `$name`?")) plugins()->drop($name);
	exit;
}

$desc[] = "plrn имя новое_имя - переименовывает плагин";
if($cmd == "plrn") {
	param_count(2);
	plugins()->rename($name, $name2);
	exit;
}

$desc[] = "crc - выявляет пути с совпадающими crc (для link и import)";
if($cmd == "crc") {
	param_count(0);
	require "lib/Utils.php";
	$crc = [];
	dirtree([["www/i"], "www", "plugin"], function($path) use (&$crc) {
		$ext = file_ext($path);
		if(!($ext == "js" || $ext == "css" || $ext == "coffee" || $ext == "html")) return;
		$c = crc32($path);
		if($x = $crc[$c])	echo "$c: $path $x\n";
		else $crc[$c] = $path;
	});
	exit;
}

$desc[] = "run - запускает приложение в консоли";
if($cmd == "run") {
	param_count(0);
	//server_stop(false);
	require_once "index.php";
	exit;
}

$desc[] = "start - запускает http-сервер приложения";
if($cmd == "start") {
	param_count(0);
	$argv[1] = "daemon";
	require_once "index.php";
	exit;
}

$desc[] = "stop - останавливает http-сервер приложения";
if($cmd == "stop") {
	param_count(0);
	server_stop();
	exit;
}

$desc[] = "restart - перезапускает http-сервер приложения";
if($cmd == "restart") {
	param_count(0);
	server_stop();
	$argv[1] = "daemon";
	require_once "index.php";
	exit;
}

$desc[] = "status - информирует о состоянии http-сервера приложения";
if($cmd == "status") {
	param_count(0);
	$pid = (int) @file_get_contents("log/index.pid");
	$workers = plugins()->app->ini["server"]["workers"];
	echo "Статус     PID       Обработчиков\n";
	if($pid and posix_kill($pid, 0)) 
	echo "Запущен    $pid      $workers\n";
	else
	echo "Лежит                $workers\n";
	exit;
}

$desc[] = "cron - записывает шаблон conf/crontab в crontab";
if($cmd == "cron") {
	param_count(0);
	$pwd = system("pwd");
	$crontab = file_get_contents("conf/crontab");
	$crontab = str_replace('$USERDIR', $pwd, $crontab);
	$f = popen("crontab -e", "wb");
	fwrite($f, $crontab);
	pclose($f);
	exit;
}

$desc[] = "test [тест1 тест2...] - запускает тесты. Например: app test model realtyList";
if($cmd == "test") {	 // Удаляет записи созданные тестами. Сообщает о неиспользуемых полях
	require "lib/Color.php";
	plugins();	// создаём подключение
	
	$tables = [];
	
	foreach(R::$writer->getTables() as $table) {		// получаем максимальные id для существующих таблиц
		try {
			$tables[$table] = R::getCell("select max(id) from \"$table\"");
		} catch(Exception $e) {}
		//echo "$table=".$tables[$table]." ";
	}
	
	function exit_handler() {
		global $tables, $ret, $param, $COLOR;
		
		if(!$param && $ret == 0) {	// если нет параметров и выход был 
			$nouse_table = [];
			$nouse_field = [];
			
			foreach(R::$writer->getTables() as $table) {		// удаляем появившиеся за время тестов записи
				$maxid = def($tables[$table], 0);
				try {
					$newmaxid = R::getCell("select max(id) from \"$table\""); // currval - не использовать, если в тестах добавленные записи удаляются, то должна остаться хоть одна
				} catch(Exception $e) { continue; }
				
				if($maxid+1 > $newmaxid) {
					$nouse_table[] = $table;
					continue;
				}
				
				$all = R::getAll("select * from \"$table\" where id between ? and ?", [$maxid+1, $newmaxid]);
				
				if(!$all) echo "Нельзя определить неиспользуемые поля, так как тест удалил все свои записи из $table\n";
				else {
					$r = [];
					foreach($all as $row)
					foreach($row as $key=>$val) if(!$r[$key]) $r[$key] = isset($val);
					
					foreach($r as $key=>$val) if(!$val) $nouse_field[] = "$table.$key";
				}
			}
			if($nouse_table) echo "{$COLOR[RED]}Неиспользуемые таблицы:{$COLOR[RESET]}\n\t".join("\n\t", $nouse_table)."\n\n";
			if($nouse_field) echo "{$COLOR[RED]}Неиспользуемые поля:{$COLOR[RESET]}\n\t".join("\n\t", $nouse_field)."\n\n";
		}

		echo "{$COLOR[YELLOW]}Очистка таблиц от тестовых данных{$COLOR[RESET]} ";
		foreach(R::$writer->getTables() as $table) {
			$maxid = def($tables[$table], 0);
			$time = microtime(true);
			try {
				R::exec("delete from \"$table\" where id > ?", [$maxid]);
			} catch(Exception $e) { continue; }
			
			echo ".";
			
			// сбрасываем счётчик последовательности к максимальному элементу (чтобы небыло разрывов)
			if(!$maxid) $maxid=1;
			//R::exec("alter sequence {$table}_id_seq restart $maxid");
			R::exec("select setval(pg_get_serial_sequence(?, 'id'), ?)", [$table, $maxid]);
		}
		echo " {$COLOR[GREEN]}ok{$COLOR[RESET]}\n";
	}

	function no_handler($sig) { echo "no_handler sig=$sig\n"; }
	//exec("declare(ticks = 1);");
	if(!pcntl_signal(SIGINT, "no_handler")) die("Не могу установить SIGINT хандлер");
	if(!pcntl_signal(SIGTERM, "no_handler")) die("Не могу установить SIGTERM хандлер");
	
	//register_shutdown_function("exit_handler");
	
	$param = (count($argv)==2? "": join(" ", array_slice($argv, 2)));
	$ret = -1;
	system("php script/test.php $param", $ret);
	
	exit_handler();
	
	exit($ret);
}

$desc[] = "gen таблица кол_записей - добавляет случайные данные в указанную таблицу";
if($cmd == "gen") {
	param_count(2);
	require_once "rb_.php";
	require_once "lib/App.php";
	new App(); // инициализируем временную зону
	R::freeze( true );
	
	$columns = R::$writer->getColumns($name);
	$col = [];
	$val = [];
	foreach($columns as $key=>$type) {
		$col[] = "\"$key\"";
		if($key=='id') array_pop($col);
		else if($name == "realty" and $key == "number_room") {
			$val[] = "random()*6+1";
		}
		else if($name == "realty" and $key == "place_id") {
			$count = R::getCell("select count(*) from place");
			$val[] = "(select id from place as C where id>(random()*$count)::int and city_id is not null and C=C limit 1)";
		}
		else if(substr($key, -3) == "_id") {	# выбираем случайную запись из таблицы на которую ссылка
			$tab = substr($key, 0, -3);
			$count = R::getCell("select count(*) from \"$tab\"");
			$val[] = "(select id from \"$tab\" where id>(random()*$count)::int and C=C ORDER BY RANDOM() LIMIT 1)";	
		} else if($type == "timestamp without time zone") {
			$val[] = "to_timestamp(random()*1352374767)";
		} else {
			$val[] = "random()*2000000000";
		}
	}
	
	$sql = "insert into \"$name\" (".join(",", $col).") select ".join(",", $val)." from generate_series(1, $name2) as C returning place_id";
	//echo $sql;
	$col = R::getCol($sql);
	
	if($name == "realty") {
		echo "update place and placen\n";
		place_counter($col);
		#foreach($col as $place_id) place_counter($place_id);
	}
	
	exit;
}

$desc[] = "loaddb [файл] [1] - это загрузка данных в БД из {conf/}*файл{.json,.txt}";
if($cmd == "loaddb") {
	param_count(0, 2);
	require_once "rb_.php";
	
	$dirname = path_to_project();
	
	if($name) {
		if(file_exists($name)) $files = [$name];
		else {
			if(file_exists($name)) $files = [$name];
			else if(file_exists($path = "conf/$name")) $files = [$path];
			else if($files = glob("conf/*$name{.txt,.json}", GLOB_BRACE)) {}
			else echo "Файл $name или conf/*$name{.txt|.json} не существует.\n";
		}
	} else $files = glob("conf/*.{txt,json}", GLOB_BRACE);
	sort($files);
	
	foreach($files as $file) {
		$parts = pathinfo($file);
		$ext = $parts['extension'];
		if($ext != 'txt' &&	$ext != 'json') continue;
		$table = substr($parts["filename"], 4);
		echo "$file\n";
		
		$func = function($a) use ($table) {
			//file_put_contents("id", json_encode($a));
			$bean = R::load($table, $a["id"]);
			if($bean->id) {
				if($bean->export() == $a) return;
				$bean->import($a);
				R::store($bean);
				return;
			}

			$key = [];
			$val = [];
			$q = [];
			foreach($a as $k=>$v) {
				$key[] = "\"$k\"";
				$val[] = $v;
				$q[] = "?";
			}

			R::exec("insert into \"$table\" (".join(",", $key).") values (".join(",", $q).")", $val);
		};
		
		$idx = 0;
		
		if($ext == "txt" && !$name2) {
			$f = fopen($file, 'rb');
			$col = array_map(function($a) { return "\"".strtolower($a)."\""; }, fgetcsv($f));
			fclose($f);
			$path = $dirname."/".$file;
			try {
				R::exec("copy \"$table\" (".join(",", $col).") from '$path' with csv header quote '\"'"); 
			} catch(Exception $e) { echo $e->getMessage()."\n"; }
		}
		else if($ext=='txt') {
			$f = fopen($file, 'rb');
			$count = fstat($f)["size"];
			$col = fgetcsv($f);
			
			while($val = fgetcsv($f)) {
				$pos = ftell($f);
				if($idx++ % 1000 == 999) echo round($pos/$count*100, 2) . " %\n";
				//if($pos/$count < 0.98) continue;
				$a = [];
			
				foreach($val as &$v) if($v==="") $v = null;
			
				for($i=0; $i<count($col); $i++) $a[$col[$i]] = $val[$i];
				$func($a);
			}
			fclose($f);
		} else {
			$data = json_decode(file_get_contents($file), true);
			if(!$data) echo "Повреждённый json в $file\n";
			$count = count($data);
			foreach($data as $a) {
				if($idx++ % 1000 == 999) echo round($idx/$count*100, 2) . " %\n";
				$func($a);
			}
		}

		try {
			$maxid = R::getCell("select max(id) from \"$table\"");
			R::exec("select setval(pg_get_serial_sequence(?, 'id'), ?)", [$table, $maxid]);
		} catch(Exception $e) {
		}
		
	}
	exit;
}

$desc[] = "savedb №-таблица - это выгрузка данных из таблицы в /conf/№-таблица.txt";
if($cmd == "savedb") {
	param_count(1, 2);
	require_once "rb_.php";
	
	list($num, $table) = split("-", $name);
	
	if($name2 == "") {
		$path = path_to_project()."/conf/$name.txt";
		
		$sql = "select * from \"$table\" limit 1";
		$r = R::getRow($sql);
		$col = array_map(function($a) { return "\"$a\"";}, array_keys($r));
		
		R::exec("copy \"$table\" (".join(",", $col).") TO '$path' with csv header quote '\"'"); 
	
	} else {
	
		$f = fopen("conf/$name.txt", "wb");
		$count = R::getCell("select count(*) from $table");
		$sql = "select * from $table where id>? group by id limit 1000";
		$id = 0;
		$r = R::getAll($sql, [$id]);
		$col = array_keys($r[0]);
		fputcsv($f, $col, ',', "'");
		for(; count($r);) {
			$i += count($r);
			echo round($i/$count*100, 2)." %\n";
			for($j = 0; $j<count($r); $j++) {
				$row = [];
				for($k=0; $k<count($col); $k++) $row[] = $r[$j][$col[$k]];
				fputcsv($f, $row, ',', "'");
			}
			$id = $r[count($r)-1]["id"];
			$r = R::getAll($sql, [$id]);
		}
	}
	exit;
}

$desc[] = "fordb путь_к_json - копирует *.json сделанные www/test/ex.html в /conf/*.json";
if($cmd == "fordb") {
	param_count(1);
	require_once("lib/Utils.php");
	
	$files = glob("$name/*.json");
	foreach($files as $file){
		$path_parts = pathinfo($file);
		$file_name = $path_parts["filename"];
		echo $file."\n";
		
		$data = json_decode(file_get_contents($file), true);
		
		$table = [];
		$id = 1;
		
		foreach($data as $a1){
			if(!is_array($a1)) continue;
			foreach($a1 as $a) {
				if(!is_array($a)) continue;
				$name = $a["name"];
				if(!$name) continue;				
				$table[] = [id=>$id++, name => $name];
			}
		}
		
		file_put_contents("conf/$file_name.json", json_encode_cyr($table));
		
	}
	exit;
}

$desc[] = "newtask имя_бранча [1] - [1 - вернуться на мастер и стереть] - создаёт новый бранч на origin";
if($cmd == "newtask") {
	param_count(1, 2);
	system("git checkout -b '$name'", $ret);	if($ret != 0) exit;
	system("git push origin '$name'", $ret);	if($ret != 0) exit;
	if($name2) {
		system("git checkout master", $ret);	if($ret != 0) exit;
		system("git branch -D '$name'", $ret);
	}
	exit;
}

$desc[] = "gettask имя_бранча - забирает бранч с origin";
if($cmd == "gettask") {
	param_count(1);
	system("git checkout -b '$name'", $ret);	if($ret != 0) exit;
	system("git pull origin '$name'", $ret);
	exit;
}

$desc[] = "savetask комментарий - делает коммит и отправляет бранч в origin";
if($cmd == "savetask") {
	param_count(1);
	savetask($name);
	$branch = get_branch();
	system("git push origin '$branch'", $ret);
	exit;
}

$desc[] = "mergetask [комментарий] - сливает текущий бранч с origin master";
if($cmd == "mergetask") {
	param_count(0, 1);
	if($name) savetask($name);
	$branch = get_branch();
	system("git push origin '$branch'", $ret);			if($ret != 0) exit;
	system("git checkout master", $ret);				if($ret != 0) exit;
	system("git merge --no-ff origin '$branch'", $ret);	if($ret != 0) exit;
	system("git push", $ret);							if($ret != 0) exit;
	system("git branch -D '$branch'", $ret);
	exit;
}

$desc[] = "help - эта справка";
if($cmd == "help" || $cmd == "-h" || $cmd == "--help") {
	require "lib/Color.php";
	$to = [$COLOR[MAGENTA], $COLOR[CIAN], $COLOR[RED], $COLOR[GREEN]];
	foreach($desc as $cmd) {
		list($x, $y) = split(" - ", $cmd, 2);
		$i = utf8len($x);
		for(; $i < 25; $i++) $x .= " ";
		$to[] = $to[0];
		$to[] = $to[1];
		array_shift($to);
		array_shift($to);
		echo "{$to[0]}$x {$to[1]}$y{$COLOR[RESET]}\n";
	}
	exit;
}

echo "Команда `$cmd` не поддерживается\n";


###### Далее идут функции

# возвращает текущий бранч
function get_branch() {
	preg_match('/\* (.*)/', `git branch`, $ret);
	return $ret[1];
}

# сохраняет задание
function savetask($name) {
	system("git status");
	if(!confirm("Сохранить?")) exit;
	system("git commit -am '$name'", $ret);	if($ret != 0) exit;
}

# спрашивает пользователя
function confirm($msg) {
	for(;;) {
		echo "$msg (yes/no) ";
		$x = trim( fgets(STDIN) );
		if( $x == "yes" ) return true;
		if( $x == "no" ) return false;
	}
}

# проверяет количество переданных параметров
function param_count($n, $u = null) {
	global $argv;
	$k = count($argv)-2;
	if($u) {
		if($n<=$k and $k<=$u) return;
		die("Данная команда требует от $n до $u параметров, а вы передаёте ей $k\n");
	}
	if($k != $n) die("Данная команда требует $n параметров, а вы передаёте ей $k\n");
}

# подключает класс "плагины" и возвращает объект "плагины"
function plugins() {
	require_once "lib/App.php";
	$app = (new App)->init();
	return $app->plugins;
}

# возвращает количество символов в строке utf8
function utf8len($s) {
	$len = 0;
	$n = strlen($s);
	for($i=0; $i<$n; $i++) {
		$len++;
		$ch = ord($s[$i]);
		if(($ch & 0b11110000) == 0b11110000) $i+=3;
		else if(($ch & 0b11100000) == 0b11100000) $i+=2;
		else if(($ch & 0b11000000) == 0b11000000) $i++;
	}
	return $len;
}

// останавливает сервер по index.pid
function server_stop($echo = true) {
	$pid = (int) @file_get_contents("log/index.pid");
	if($pid == 0) { echo "Сервер не запущен\n"; return; }
	if( !posix_kill($pid, SIGHUP) and $echo ) echo "Сервер не остановлен\n";
	unlink("log/index.pid");
}

// возвращает виндовый путь для загрузки/выгрузки постгреса
function path_to_project() {
	$dirname = dirname(__FILE__);
	$cygdrive = "/cygdrive/";
	if(substr($dirname, 0, strlen($cygdrive)) == $cygdrive) { 
		$dirname = substr($dirname, strlen($cygdrive));
		$drive = $dirname[0];
		$dirname[0] = ":";
		$dirname = $drive.$dirname;
	} else $dirname = (substr(php_uname(), 0, 6) == "CYGWIN"? "c:/cygwin/": "").$dirname;
	return $dirname;
}
