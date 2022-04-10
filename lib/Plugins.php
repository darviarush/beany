<?php

/**
Класс подключает плагины
*/

require_once "Utils.php";
require_once "Model.php";
require_once "AException.php";

class PluginException extends Exception {}

class Plugins {
	private $pathToList = "www/plugin.json";
	private $names = [];
	public $app;

	# возвращает имена
	function getNames() { return array_keys($this->names); }
	
	# регистрируется в указанном приложении
	function __construct($app) {
		$app->plugins = $app;
		$this->app = $app;
		$this->names = def(json_decode(@file_get_contents($this->pathToList), true), []);
	}
	
	# загружает плагин без проверок
	function loadAsPlugin($path) {
		$app = $this->app;
		$controllers = $app->controllers;
		require_once $path;
	}
	
	# загружает один плагин
	function loadOne($name, $add = "") {
		if(!isset($this->names[$name])) throw new PluginException("Загружаемый плагин `$name` не подключён");
		$this->loadAsPlugin("plugin/$name/$name$add.php");
		$this->names[$name] = $this->checkDepend($name);
	}
	
	# загружает плагины
	function load($add = "") {
		foreach($this->names as $name=>$val) $this->loadOne($name, $add);
	}
	
	# загружает тесты плагинов
	function loadTests() {
		$this->load("Test");
	}
	
	# возвращает зависимости от ещё не установленных плагинов
	function getDepend($name) {
		$names = [$name];
		$depends = [];
		while($names) {
			$name = array_pop($names);
			$depend = readln("plugin/$name/depend.txt");
			foreach($depend as $dep) if(!isset($this->names[$dep])) {
				$names[] = $dep;
				array_unshift($depends, $dep);
			}
		}
		return $depends;
	}
	
	# возвращает зависимости от ещё не установленных плагинов
	function getAllDepend($name) {
		$names = [$name];
		$depends = [];
		while($names) {
			$name = array_pop($names);
			$depend = readln("plugin/$name/depend.txt");
			foreach($depend as $dep) {
				$names[] = $dep;
				$depends[] = $dep;
			}
		}
		return $depends;
	}
	
	# возвращает инсталлированные плагины которые зависят от плагина $name
	function getDependFrom($name) {
		$depends = [];
		$names = [$name];
		while($names) {
			$name = array_pop($names);
			foreach($this->names as $key => $depend) if(in_array($name, $depend)) {
				array_unshift($depends, $key);
				$names[] = $key;
			}
		}
		return $depends;
	}
	
	# возвращает все плагины которые зависят от плагина $name
	function getAllDependFrom($name) {
		$plugin = scandir("plugin");
		array_shift($plugin); // удаляем .
		array_shift($plugin); // удаляем ..
		$dep = [];
		foreach($plugin as $pl) $dep[$pl] = readln("plugin/$pl/depend.txt");
		$depends = [];
		$names = [$name];
		while($names) {
			$name = array_pop($names);
			foreach($dep as $key => $depend) if(in_array($name, $depend)) {
				array_unshift($depends, $key);
				$names[] = $key;
			}
		}
		return $depends;
	}
		
	# если какие-то зависимости неудовлетворены выдаёт эксепшн
	function checkDepend($name) {
		$depend = readln("plugin/$name/depend.txt");
		foreach($depend as $dep) if(!isset($this->names[$dep])) throw new PluginException("Загружаемый плагин `$name` имеет неудовлетворённую зависимость `$dep`");
		return $depend;
	}
	
	# добавляет плагин в список
	function install($name) {
		Plugins::plnotexists($name);
		if(isset($this->names[$name])) throw new PluginException("Плагин `$name` уже инсталлирован");
		$this->names[$name] = $this->checkDepend($name);
		file_put_contents($this->pathToList, json_encode_cyr($this->names));
	}
	
	# удаляет плагин из списка
	function uninstall($name) {
		Plugins::plnotexists($name);
		if(!isset($this->names[$name])) throw new PluginException("Плагин `$name` уже деинсталлирован");
		$depend = $this->getDependFrom($name);
		if($depend) throw new PluginException("От плагина `$name` зависят плагины: ".join(", ", $depend));
		unset($this->names[$name]);
		file_put_contents($this->pathToList, json_encode_cyr($this->names));
	}
	
	# переименовывает плагин. Внимание! Переименовывает только папки
	function rename($name, $name2) {
		Plugins::plnotexists($name);
		if(file_exists("plugin/$name2")) throw new PluginException("Уже существует `$name2` - нельзя переименовать");
		if(isset($this->names[$name])) { $this->uninstall($name); $install = true; }
		rename("plugin/$name", "plugin/$name2");
	}
	
	# удаляет плагин
	function drop($name) {
		if(isset($this->names[$name])) $this->uninstall($name);
		removeDir(["plugin/$name"]);
	}
	
	# создаёт на основе скелетона (папка skel) новый плагин
	function create($name) {
		$path = "plugin/$name";
		$www = "plugin/$name";
		Plugins::plexists($path);
		mkdir($path);
		Plugins::skel($name, "skel.php", "$path/$name.php");
		Plugins::skel($name, "skelTest.php", "$path/{$name}Test.php");
		Plugins::skel($name, "skel.html", "$path/$name.html");
		Plugins::skel($name, "skel.js", "$path/$name.js");
		Plugins::skel($name, "skelTest.js", "$path/{$name}Test.js");
	}
	
	# проверяет - существует ли скелетон
	function plexists($path) { if(file_exists($path)) throw new PluginException("Плагин `$path` уже существует"); }
	
	function plnotexists($name) { if(!file_exists("plugin/$name")) throw new PluginException("Плагин `$name` не существует"); }

	# копирует файл скелетона в плагин
	function skel($name, $skelName, $path) {
		$skel = file_get_contents("skel/$skelName");
		$skel = str_replace(["Skel", "skel"], [ucfirst($name), $name], $skel);
		file_put_contents($path, $skel);
	}
	
	# сортирует плагины по зависимостям
	function sort_names() {
		$names = [];
		$keys = array_keys($this->names);
		while($keys) {
			$key = array_pop($keys);
			$is = 0;
			$depend = $this->names[$key];
			foreach($depend as $dep) {
				if(in_array($dep, $names)) $is++;
				else break;
			}
			if(count($depend) == $is) $names[] = $key;
			else array_unshift($keys, $key);
		}
		return $names;
	}
	
	# подмешивает в тесты ожидание ajax-запросов
	function parse_test($path) {
		$rs = file_get_contents($path);
		do {
			$js = $rs;
			$rs = preg_replace('/\n[ \t\r]*(?:wait[ \t]*\/\/[^\n]*|wait[ \t\r]*)(.*?)\n\}\)/sm', "\nstop()\nsetTimeout(function() {\n\tif(app.preloader.count) { setTimeout(arguments.callee, 100); return }\n\tstart()\n\$1\n}, 100)\n})", $js);
		} while($rs != $js);
		return "\n$rs\n";
	}
	
	/*
	# компонует index.html из index.htm и плагинов, если они изменились
	function genIndex($force = false) {
		if(!$force) {
			$mtime = filemtime("www/index.html");	# проверяем - нужно ли переписывать
			if($mtime < filemtime("www/index.htm")) $ret = true;
			else if($mtime < filemtime("www/test/index.htm")) $ret = true;
			else foreach($this->names as $plugin => $depend) {
				$path = "plugin/$plugin/$plugin";
				if($mtime < filemtime("$path.html") || $mtime < filemtime("$path.js") || $mtime < filemtime("{$path}Test.js")) { $ret = true; break; }
			}
			
			if(!$ret) return false;
		}
		$names = $this->sort_names();
		$html = "\n<script><!--\ndata.plugin = ".json_encode_cyr($this->names)."\ndata.plugins = ".json_encode_cyr($names)."\n--></script>\n";
		$tests = $this->parse_test("www/test/core-test.js");
		foreach($names as $plugin) {
			$path = "plugin/$plugin/$plugin";
			$html .= "\n<div id=plugin-$plugin>\n".file_get_contents("$path.html")."\n</div>\n";
			$html .= "\n<script><!--\n".file_get_contents("$path.js")."\n--></script>\n";
			$tests .= $this->parse_test("{$path}Test.js");
		}
		$tests = "\n<script><!--$tests--></script>\n";
		
		
		$content = file_get_contents("www/index.htm");
		$theme = $this->app->ini["server"]["theme"];
		$content = str_replace(['<!-- PLUGINS --><!-- PLUGINS -->', '/theme/'], [$html, "/$theme/"], $content);
		file_put_contents("www/index.html", $content);
		
		$content = str_replace(['<!-- TESTINDEX --><!-- TESTINDEX -->', '<!-- TESTS --><!-- TESTS -->'], [file_get_contents("www/test/index.htm"), $tests], $content);
		file_put_contents("www/test/index.html", $content);
		
		$this->app->trigger("index.html");
		
		return true;
	}*/
}