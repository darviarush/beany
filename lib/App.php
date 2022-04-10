<?php

/**
Класс приложения. Объединяет ini, менеджеры контроллеров и плагинов. И предоставляет всю необходимую информацию всем частям приложения
**/

require_once "rp.php";
require_once "rb.php";
require_once "AException.php";

class App {
	static $idx_base = 0;
	private $prop;					# все свойства app
	private $event = [];			# обработчики событий
	private $crontab = [];			# расписание
	public $locale;

	# создаёт необходимые для приложения объекты: менеджеров контроллеров и плагинов, инициализирует ini и т.д.
	function __construct($ini_arg = []) {
		require_once "Plugins.php";
		require_once "Controllers.php";
		require_once "Uploader.php";
		require_once "Mail.php";
        require_once "SMS.php";
		require_once "Logo.php";
		require "ini.php";
		$this->ini = array_replace_recursive($ini, $ini_arg);
		date_default_timezone_set('europe/moscow');
		$this->controllers = new Controllers($this);
		$this->plugins = new Plugins($this);
		$this->uploader = new Uploader($this);
		$this->mail = new Mail($this);
        $this->SMS = new SMS($this);
		$this->locale = new Locale($this);
		$this->logo = new Logo($this);
		//$this->log = $this->ini["server"]["log"];
	}
	
	function __set($key, $val) {
		if(!$val) throw new Exception(get_class($this).": `$key` не может быть нулевым");
		$this->prop[$key] = $val;
	}
	
	function __get($key) {
		if(!isset($this->prop[$key])) throw new Exception(get_class($this).": нет свойства `$key`");
		return $this->prop[$key];
	}
	
	# инициализирует бд
	function init() {
		$inb = $this->ini["database"];
		$this->pdo = $pdo = new CachePDO($this);
		//R::setup($pdo);
		$name = self::$idx_base;
		self::$idx_base = (self::$idx_base+1) % 2;
		R::addDatabase($name, $pdo);
		R::selectDatabase($name);
		R::freeze( true );		# структура базы данных создаётся во время тестов
		R::exec("set enable_seqscan=false");	# отключает поиск по таблице. Если будет индекс - то искать только по нему
		return $this;
	}
	
	# создаёт и бросает исключение класса AException
	function raise($msg, $code) {
		throw new AException($msg, $code);
	}
	
	# пишет в лог. Если $app->ini["server"]["syslog"] == 1, то пишет в syslog, иначе в stdout
	function log($msg, $priority=LOG_INFO) {
		$time = @strftime("%Y-%m-%d %T");
		$msg = posix_getpid()."\t$time\t$msg\n";
		echo $msg;
		#if($log == "syslog") syslog($priority, $msg);
		#else echo $msg;
	}
	
	# подключает функцию к событию
	function bind($event, $fn) {
		$this->event[$event][] = $fn;
	}
	
	# отключает функцию. Если функция не указана убирает все события
	function unbind($event, $fn = false) {
		foreach(def($this->event[$event], []) as $func) if($fn == $func) { unset($this->event[$event]); return; }
	}
	
	# срабатывает событие
	function trigger($event, &$data = []) {
		foreach(def($this->event[$event], []) as $fn) $fn($this, $data);
		return $data;
	}
	
	# устанавливает функцию срабатывающую каждые $n секунд
	# если следующий интервал прошёл во время работы функции, то он пропускается. Это сделано, чтобы
	#	недопустить постоянных операций
	# $begin - время начала выполнения операции, можно установить с помощью time() или mktime(). Не используйте 0 - будет тормозить
	function cron($begin, $n, $fn, $start=false) {
		if(!$n) {
			foreach($this->crontab as $k=>$cron) if($cron[0] == $fn) {unset($this->crontab[$k]); return;}
			return;
		}
		if(!$start) for(; $begin<time(); $begin+=$n); // переносим в будущее при запуске
		$this->crontab[] = [$fn, $n, $begin];
	}
	
	# бесконечный цикл для выполнения установленных cron функций
	function cron_listen() {
		$this->init();			# создаём подключение в этом процессе
		for(;;) {
			sleep(1);
			$this->cron_run();
		}
	}
	
	# выполняет функции cron
	function cron_run($add=0) {
		$run = [];
		$crontab = $this->crontab;

		foreach($crontab as $k=>$f) {
			if($f[2] <= time()+$add) { $run[] = $k; $this->crontab[$k][2] += $f[1]; }
		}
		
		foreach($run as $k) {
			$f = $crontab[$k][0];
			$ret = $f();	// запускаем
			if($ret === false) 	unset($this->crontab[$k]);		// удаляем, если функция больше не хочет выполняться
		}
	}
	
	# загружает локали
	#function load_locale() {
	#	$lang = [];
	#	foreach(glob("locale/*.po") as $po) $lang[substr($po, 7, strlen($po)-7-3)] = readlang($po);
	#	return $this->locale = $lang;
	#}
}

class Locale {
	private $lang;
	public $app;

	function __construct($app) {
		$this->app = $app;
	}
	
	function is($po) {
		$this->load();
		return isset($this->lang[$po]);
	}
	
	function get($po) {
		$x = $this->lang[$po];
		if($x) return $x;
		$x = $this->lang[$po] = readlang("locale/$po.po");
		return $x;
	}
	
	function load() {
		if($this->langs) return;
		foreach(glob("locale/*.po") as $po)	$this->lang[substr($po, 7, strlen($po)-7-3)] = null;
	}
	
	function langs() {
		$this->load();
		return array_keys($this->lang);
	}
}