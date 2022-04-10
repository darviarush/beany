<?php
/**
	http-cервер проекта
	Должен каскадироваться с nginx:
	@@nginx.conf
	...
	location /api/ {
		proxy_pass 127.0.0.1:9000
	}
	...
	
	Работает только с адресами начинающимися на /api/, например:
	http://localhost:9000/api/xxx
	
	Запускайте "$ php index.php" из папки проекта
	
	php должен быть собран, как указано в doc/install.txt
	
	Спецификация протокола http / http://www.w3.org/Protocols/HTTP/1.1/draft-ietf-http-v11-spec-01.html
*/

chdir(dirname(__FILE__));
require_once "lib/Color.php";	// цвета консоли
require_once "ini.php";		// конфигурация проекта

$TEST = $ini["server"]["test"];

// выводит ошибку сокета и завершается
function sock_err($msg, $e) { if($e) return; echo "$msg: ".socket_strerror(socket_last_error())."\n"; exit; }
function msg($msg) { global $COLOR, $TIME; $TIME = microtime(true); echo "{$COLOR[YELLOW]}$msg{$COLOR[RESET]} ... "; }
$ALLTIME = 0;
function ok() { global $COLOR, $TIME, $ALLTIME; $ALLTIME += $interval = microtime(true) - $TIME; echo "{$COLOR[GREEN]}ok{$COLOR[RESET]} ".sprintf("%g", $interval)."\n";  }
function alltime() { global $COLOR, $ALLTIME; echo "{$COLOR[YELLOW]}Всего: {$COLOR[RESET]}".sprintf("%g", $ALLTIME)."\n"; }

# открываем сокет
$SERVER_PORT = $ini[server][port];
msg("socket create on port {$COLOR[RED]}$SERVER_PORT");

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);		// создаём сокет
sock_err("socket_create", is_resource($socket));

sock_err("socket_set_option", socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1));		// захватывать сокет, если он был некорректно закрыт при прежнем использовании
sock_err("socket_bind", socket_bind($socket, '127.0.0.1', $SERVER_PORT));					// какой порт слушать на каком адресе
sock_err("socket_listen", socket_listen($socket));											// слушать и в очередь

ok();

# тут нужно выполнить то, что должно остаться во всех процессах
# загружаем плагины
msg("подключаем lib/App.php");
require_once "lib/App.php";
ok(); msg("new App");
$app = new App;
ok(); msg("подключение к базе");
$app->init();			# подключаемся к базе
ok(); msg("очистка кэша");
$app->pdo->casherem();	# чистим кеш
ok();

msg("загрузка плагинов");
$app->plugins->load();
$app->plugins->loadAsPlugin("control.php");
ok();

msg("получение списка таблиц базы");
$app->controllers->getTableInfo();	# контроллеру нужна информация о таблицах
ok(); msg("создание справочников");
$app->controllers->buildref();		# создаём справочники
ok(); msg("синхронизация контроллеров с базой");
$app->controllers->sync();			# синхронизируем контроллеры с базой
ok(); msg("синхронизация логотипов с базой");
$app->logo->sync();			# синхронизируем логотипы с базой
ok();

msg("инициализация");
$app->trigger("init");				# сигнал инициализации
ok();
R::close();							# закрываем соединение

if($TEST) { # каждую секунду проверяем - нужно ли перезагружать сервер
	msg("чтение дерева каталогов");
	$tmpl = [];
	$script = [];
	dirtree([["www/i", "www/theme/img", "www/theme/images"], "www", "lib", "plugin", "control.php", "index.php", "ini.php"], function($path) use (&$script, &$tmpl) {	# инициализируем
		$ext = file_ext($path);
		if($ext == "php") $script[$path] = filemtime($path); # время последнего доступа
		else if($ext == "html" || $ext == "js" || $ext == "coffee" || $ext == "css") $tmpl[$path] = filemtime($path);
	});

	$app->cron(time(), 1, function() use ($app, &$script, &$tmpl) {
		global $COLOR;
		
		# проверяем скрипты
		foreach($script as $path=>$mtime) {
			$time = filemtime($path);  # время последнего доступа
			#echo "$path $mtime $time\n";
			if($time == $mtime) continue;
			
			system("php -l '$path'", $ret);
			if($ret==0) $reload = true;
			else { $reload = false; break; }
		}
		
		# нужно ли перезагружать шаблоны
		$controllers = &$app->controllers;
		$tmpl_cashe = &$controllers->tmpl_cashe;
		foreach($tmpl as $path=>$mtime) {
			$time = filemtime($path);  # время последнего доступа
			if($time == $mtime) continue;
			echo "{$COLOR[YELLOW]}Изменился темплейт {$COLOR[RED]}$path{$COLOR[RESET]}\n";
			$reload = true;
			break;
		}
		
		# перезагружаемся
		if($reload) {
			echo "{$COLOR[RED]}перезагружаемся{$COLOR[RESET]}: ".posix_getppid()." ".posix_kill(posix_getppid(), SIGTERM)."\n";
			return false;	# останавливаем выполнение в кроне
		}
		
	});
	ok();
}


$WORKERS = [];					// обработчики
# устанавливаем хуки для обрабатываемых сигналов
function sig_handler($signo) {
	global $WORKERS, $app, $cron, $socket;
	socket_close($socket);
	
	foreach($WORKERS as $worker=>$tmp) { // рассылаем всем 
		$res = posix_kill($worker, SIGTERM);
		if($res) { pcntl_wait($tmp); $app->log("Остановлен процесс № $worker"); }
		else $app->log("Не могу остановить процесс № $worker");
	}
	$res = posix_kill($cron, SIGTERM);
	if($res) { pcntl_wait($tmp); $app->log("Остановлен процесс № $cron (cron)"); }
	else $app->log("Не могу остановить процесс № $cron (cron)");
	
	unlink("log/index.pid");
	
	if($signo != SIGTERM) exit(); // завершаемся
	pcntl_signal(SIGHUP, SIG_DFL);
	pcntl_signal(SIGTERM, SIG_DFL);
	pcntl_sigprocmask(SIG_UNBLOCK, [SIGHUP, SIGTERM]);
	pcntl_exec("/usr/bin/env", ["php", "index.php"]);  # в freebsd потом сигналы на второй раз не действуют
	exit;
}

# если в командной строке передан параметр daemon - демонизируемся
if($argv[1] == "daemon") {
	msg("daemon");
	$pid = pcntl_fork();
	if($pid==-1) die("Не могу выполнить fork\n");
	if($pid) exit;	// это родительский процесс - убиваем его
	if(posix_setsid() == -1) die("Не удалось отсоединится от терминала\n");

	ok();
	
	fclose(STDIN);
	fclose(STDOUT);
	fclose(STDERR);
	ini_set('error_log', 'log/error.log');
	$STDIN = fopen('/dev/null', 'rb');
	$STDOUT = fopen('log/app.log', 'ab');
	$STDERR = fopen('log/daemon.log', 'ab');
}

msg("запись pid в файл");
$index_pid = (int) @file_get_contents("log/index.pid");
if($index_pid) posix_kill($index_pid, SIGHUP);			# останавливаем предыдущий 
file_put_contents("log/index.pid", posix_getpid());		# сохраняем pid
ok();
alltime();

# создаются процессы-обработчики
$workers = $ini[server][workers];	// количество
for($i = 0; $i < $workers; $i++) {
	$pid = pcntl_fork();
	if($pid == -1) die("fork завершился с ошибкой");
	if($pid == 0) break;	// это потомок - в нём порождать дочерние процессы не надо - выходим
	$WORKERS[$pid] = 1;
}

# менеджер процессов - восстанавливает завершившиеся процессы
if($pid) {
	# создаём процесс для обработки крона
	$cron = pcntl_fork();
	if($cron == -1) { $app->log("Не создан cron. Ошибка fork %m", LOG_EMERG); $cron = -2; }
	else if(!$cron) $app->cron_listen();

	$app->log("Запущены обработчики: ".join(", ", array_keys($WORKERS)).", $cron (cron)");

	if(!pcntl_signal(SIGHUP, "sig_handler")) die("Не могу установить SIGHUP хандлер");
	if(!pcntl_signal(SIGTERM, "sig_handler")) die("Не могу установить SIGTERM хандлер");
	for(;;) {
		# ждём пол секунды
		usleep(500000);
		# проверяем сигналы
		pcntl_signal_dispatch();
		# получаем завершившийся или остановленный процесс-потомок
		$kid = pcntl_waitpid(-1, $status, WNOHANG);
		if($kid == -1) { $app->log("Ошибка pcntl_waitpid %m", LOG_EMERG); exit; }
		if($kid == 0) continue;

		$app->log("Завершился обработчик № $kid ".($cron == $kid? "(cron)": "")."; cтатус: $status. Восстанавливаю", LOG_WARNING);
		
		if($cron == $kid) {
			$cron = pcntl_fork();
			if($cron == -1) { $app->log("Не создан cron. Ошибка fork %m", LOG_EMERG); $cron = -2; }
			else if(!$cron) $app->cron_listen();
			else continue;
		}
		
		unset($WORKERS[$kid]);
		#if(posix_kill($kid, 0)) posix_kill($kid, 9); # мочим, если он просто заснул
		
		# порождаем новый процесс в замен завершившегося
		$kid = pcntl_fork();
		if(!$kid) {		// это потомок - на обработчик
			$WORKERS = [];
			break;
		}
		if($kid == -1) { $app->log("fork завершился с ошибкой %m", LOG_EMERG); continue; }
		$app->log("Запущен обработчик № $kid");
		$WORKERS[$kid] = 1;
	}
}

# процесс-обработчик
# создаём подключение к БД
msg("{$COLOR[RED]}инициализация модели");
$app->init();
$app->controllers->initModel();
ok();

# считывает строку из сокета
function reads($ns) {
	$BUFSIZE = 1024*4;	// максимальная длина строки в http-заголовке
	$line = socket_read($ns, $BUFSIZE, PHP_NORMAL_READ);
	if($line[strlen($line)-1] == "\r") socket_read($ns, $BUFSIZE, PHP_NORMAL_READ);	// считываем \n
	return rtrim($line);
}

# функция для инкапсуляции переменных
function request_hub($ns) {
	global $app, $COLOR, $TEST, $ALLTIME;
	
	for(;;) {
		$HTTP = @reads($ns);	// читаем заголовок HTTP
		if(!$HTTP) break;		// выходим, если сервер закрыл соединение
		
		if($TEST) {
			$ALLTIME = 0;
			msg("Запрос $HTTP");
		}
		
		# если это не запрос HTTP - отключаем
		$res = preg_match('/^(\w+) ([^\s\?]+)(?:\?(\S+))? HTTP\/(\d\.\d)\r?$/', $HTTP, $groups);
		if(!$res) break;	# на глупые запросы не отвечаем
		list($HTTP, $HTTP_PROTO, $HTTP_URL, $HTTP_SEARCH, $HTTP_VERSION) = $groups;
		
		# считываем заголовки
		$HEAD = [];
		while($line = reads($ns)) {
			if($line == "") break;
			$pos = strpos($line, ": ");

			if($pos) $HEAD[substr($line, 0, $pos)] = substr($line, $pos+2);	// ошибки в заголовке HTTP никак не обрабатываем
		}
		
		# заголовки ответа
		$OUTHEAD = array("Content-Type" => "text/plain; charset=utf-8");
		
		# парсим get-параметры
		parse_str($HTTP_SEARCH, $GET);
		
		# парсим куки
		$cookie = parse_cookie($HEAD["Cookie"]);
		
		$ARGV = (object) [
			HTTP=>$HTTP, HTTP_PROTO=>$HTTP_PROTO, "url"=>$HTTP_URL, HTTP_SEARCH=>$HTTP_SEARCH, HTTP_VERSION=>$HTTP_VERSION,
			HEAD=>$HEAD, OUTHEAD=>&$OUTHEAD, HTTPOUT=>"200 OK", param=>$GET, GET=>$GET, cookie=>$cookie
		];
		
		# пришла multipart/form-data c файлами
		$multipart = "multipart/form-data";
		
		# настраиваем сессионное подключение (несколько запросов на соединение, если клиент поддерживает)
		$KEEP_ALIVE = (strtolower($HEAD["Connection"]) == 'keep-alive');
		if($KEEP_ALIVE) $OUTHEAD["Connection"] = "keep-alive";
		
		# считываем POST-параметры
		$CONTENT_LENGTH = (int) $HEAD["Content-Length"];
		if($CONTENT_LENGTH) {
			$POST = "";
			for($i = 0; $i < $CONTENT_LENGTH; $i=strlen($POST)) {
				$POST .= socket_read($ns, $CONTENT_LENGTH);
			}
			
			if(substr($HEAD["Content-Type"], 0, strlen($multipart)) == $multipart) {
				$arr = parse_mfd($HEAD["Content-Type"]);
				$boundary = $arr["boundary"];
				$POST = parseMultipartFormData($boundary, $POST);
			} else parse_str($POST, $POST);
			
			$ARGV->POST = $POST;
			$ARGV->param = array_merge($ARGV->GET, $POST);
		}
		
		if($TEST) {
			ok();
			msg("Обработка запроса");
		}
		
		# запускаем обработчик запроса
		$BODY = $app->controllers->run($ARGV);
	
		if($TEST) ok();
	
		# отправляем ответ
		$OUTHEAD["Content-Length"] = strlen($BODY);

		if($TEST) {
			if($boundary) {
				$body = "<<binary data>>";
				$post = $POST;
				array_walk_recursive($post, function(&$val, $key) use ($body) { if($key === 0) $val = $body; });
			} else {
				$body = $BODY;
				$post = $POST;
			}
						
			echo "\n\n$HTTP\n";
			foreach($HEAD as $key=>$val) echo "{$COLOR[MAGENTA]}$key{$COLOR[RESET]}: {$COLOR[CIAN]}$val\n";
			echo $COLOR[RESET];
			
			if($post) foreach($post as $key=>$val) echo "{$COLOR[YELLOW]}$key{$COLOR[RESET]}: {$COLOR[WHITE]}".print_r($val, true)."\n";
			
			echo "\nHTTP/1.1 {$ARGV->HTTPOUT}\n";
			foreach($OUTHEAD as $key=>$val) echo "{$COLOR[RED]}$key{$COLOR[RESET]}: {$COLOR[GREEN]}$val\n";	
			echo $COLOR[RESET];
			$len = 100;
			if(strlen($body)>$len) $body = substr($body, 0, $len) . "\n{$COLOR[GREEN]}<...>{$COLOR[RESET]}\n";
			echo $body;
			echo "\n";
			
			msg("Отправка ответа");
		}
		
		
		
		socket_write($ns, "HTTP/1.1 ".$ARGV->HTTPOUT."\r\n");
		foreach($OUTHEAD as $key=>$val) socket_write($ns, "$key: $val\r\n");
		socket_write($ns, "\r\n");
		socket_write($ns, $BODY);
		
		if($TEST) {
			ok();
			alltime();
		}
		
		if(!$KEEP_ALIVE) break;
	}
}

// ob_start

// бесконечный цикл: ожидаем и загружаем сокеты
for(; $ns = socket_accept($socket); socket_close($ns)) request_hub($ns);

$app->log("socket_accept завершился неудачей %m", LOG_ERR);
