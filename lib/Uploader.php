<?php

/**
Принимает сокет с запросом multipart/form-data и вызывает хандлер, который используется для progress-bar-а
*/

class Uploader {
	public $app;
	public $argv;
	public $boundary;
	public $len;				# content-length
	public $process;			# хандлер для progress-bar-а
	public $start;				# сообщает, что хеадеры ушли
	static $block_size = 4096;	# размер блока в байтах, который считывается из сокета

	function __construct($app) {
		$this->app = $app;
	}
	
	# инициализирует при очередном запросе
	function init($argv, $process) {
		$arr = parse_mfd($argv->HEAD["Content-Type"]);
		$this->app->log("init uploader. Content-Type=".print_r($arr, true));
		$boundary = $arr["boundary"];
		$this->argv = $argv;
		$this->len = (int) $argv->HEAD["Content-Length"];
		$this->boundary = $boundary;
		$this->process = $process;
		if(!$boundary) throw new AException("Нет boundary в Content-Type", 502);
		$this->start = false;
		return $this;
	}
	
	# записывает в сокет. Если запись 1-я, то записывает так же заголовки
	function write($s) {
		$argv = $this->argv;
		$ns = $argv->ns;
		if(!$this->start) {
			socket_write($ns, "HTTP/1.1 ".$argv->HTTPOUT);
			foreach($argv->OUTHEAD as $key=>$val) socket_write($ns, "$key: $val\r\n");
			socket_write($ns, "\r\n");
			$this->start = true;
			$this->app->log("out=".print_r($argv->OUTHEAD, true));
		}
		$this->app->log("s=`$s`");
		if($s) socket_write($ns, $s);
	}
	
	# считывает из сокета данные и вызывает обработчик. Возвращает массив параметров
	function process() {
		$argv = $this->argv;
		$ns = $argv->ns;
		$buf = '';
		$k = 0;
		$len = $this->len;
		$process = $this->process;
		for(;;) {
			$n = $len - $k;
			if($n == 0) break;
			if($n > self::$block_size) $n = self::$block_size;
			$buf .= $read = socket_read($ns, $n);
			$this->app->log("n=$n len=$len k=$k read.len=".strlen($read)."\n");
			if(strlen($read) != $n) return;			# выходим ничего не загрузив
			$k = strlen($buf);
			$this->write( $process($k, $argv) );
		}
		
		$this->write( $process($len, $argv) );
		
		$ret = parseMultipartFormData($this->boundary, $buf);
		
		#file_put_contents("log/param.txt",  print_r($param, true));
		#file_put_contents("log/buf.txt", $buf);
		#file_put_contents("log/ret.txt", print_r($ret, true));
		#$this->app->log("save `$boundary`");
		#echo "===== process result=", print_r($ret, true);
		return $ret;
	}
}