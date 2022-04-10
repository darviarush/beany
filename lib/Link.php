<?php
# Класс инклудов
# расширяет класс Controllers

require_once "Utils.php";

class Link {
	static $header = "<!DOCTYPE html>";
	public $tmpl_cashe = [];			# шаблоны

	# определяет по параметру - возвращать json или html
	function link($ret, $argv) {
		if(!isset($argv->param["F"])) return json_encode_cyr($ret);	# возврат данных в виде json
		# возврат шаблона
		if(!isset($argv->F)) {
			$F = $argv->param["F"];
			if($F) $F = split(",", $F); else $F = [];	# список crc путей файлов
			$set = [];
			foreach($F as $f) $set[$f] = 1;
			$argv->F = $set;
		}
		$path = (strpos($argv->controller_name, "/") === false? "www/": "plugin/").$argv->controller_name.".html";
		$ret = $this->tmpl($path, $argv, $ret);
		if(isset($F)) {							# добавляем crc сумму инклудов
			$J = array_keys($argv->F);
			$del = array_splice($J, 0, count($F));
			$F = join(",", $J);
			//echo "del=".print_r($del, true)." F=".print_r($F, true)." J=".print_r($J, true)."\n";
			
			if(substr($ret[1], 0, strlen(self::$header)) == self::$header) {
				$ret[1] = preg_replace('/<head>/', "<head>\n<script>\n\$F=[$F]\n</script>\n", $ret[1]);
			} else array_unshift($ret, "<script>\napp.page.append($F)\n</script>\n");
		}
		$argv->OUTHEAD["Content-Type"] = "text/html; charset=utf-8";
		return join("", $ret);
	}
	
	
	# создаёт страницу на основе шаблона
	function tmpl($path, &$argv, $ret) {
		if($path[0] == "/") $path = "www$path";
		$crc = crc32($path);
		
		echo "$path  $crc  ".(isset($argv->F[$crc])? "is_in_F": " ".(isset($this->tmpl_cashe[$crc])? "call": "comp"))."\n";
		
		if(isset($argv->F[$crc])) return [];	# проверяем, что вставка нужна

		$argv->F[$crc] = 1;
		$tmpl = $this->tmpl_cashe[$crc];						# берём темплейт из кэша и выполняем
		if(isset($tmpl)) return $tmpl($ret, $argv);
		
		# в кэше нет - парсим
		$html = file_get_contents($path);
		$ext = file_ext($path);
		if($ext == "js" and $this->app->ini["server"]["tmpl_js_with_f_n"]) {	# проставляем $path:$lineno на каждой строчке
			$lineno = 0;
			$html = preg_replace_callback('/^|\/\*.*?\*\//ms', function($r) use (&$lineno, $path) {
				$r = $r[0];
				if($r) {
					$lineno += substr_count($r, "\n");
					return $r;
				}
				$lineno++;
				return "/* $path:$lineno */\t";
			}, $html);
		}
		
		if($ext == "html") $html = $this->build_tmpl($html);
		else if($ext == "css") $html = self::replace_import('/@import\s+url\(\s*[\'"]?([\w\.\/-]+)[\'"]?\s*\)\s*;/', $html);
		else if($ext == "coffee") {	# компиллируем coffee
			$html = preg_replace_callback('/^[ \t]*import[ \t]+[\w\.\/-]+[ \t\r]*$/ms', function($r) {
				return "'#########{$r[0]}'";
			}, $html);
			
			$nam = tempnam("log", "coffee_");
			$nam = substr($nam, strlen(getcwd())+1);

			file_put_contents("$nam.coffee", $html);
			system("coffee -o ".dirname($nam)." -c $nam.coffee");
			
			$html = file_get_contents("$nam.js");
			$html = preg_replace('/^.*/', "// import $path", $html);
		
			unlink("$nam.coffee");
			unlink("$nam.js");
			unlink("$nam");
			
			$html = self::replace_import('/[ \t]*[\\\\]\'#########[ \t]*import[ \t]+([\w\.\/-]+)[\\\\]\';/', $html);

		} else $html = self::replace_import('/^(?:\/\* [^:]+:\d+ \*\/)?[ \t]*import[ \t]+([\w\.\/-]+)/ms', $html);
		
		$cf = "\$c = \$argv->app->controllers; return array_merge(['$html']);";
		$tmpl = create_function('$x, $argv', $cf);
		$this->tmpl_cashe[$crc] = $tmpl;	#  добавляем в кэш
		$ret = $tmpl($ret, $argv);	# выполняем
		return $ret;
	}
	
	# используется в методе tmpl
	function replace_import($re, $html) {
		$html = escapequote($html);
		return preg_replace_callback($re, function($r) {
			$path = $r[1];
			if($path[0] == "/") $path = "www$path";
			return "'], \$c->tmpl('$path', \$argv, \$x), ['";
		}, $html);
	}
	
	# создаёт шаблон
	function build_tmpl($html) {
		$html = escapequote($html);
		
		$reg = '(?:\*|(\w+)((?:\.\w+)*))((?:\|\w+)*)';
		$reg_s = '\s*'.$reg.'\s*';
		
		$obr = function($r) {
			$path = str_replace(".", "']['", $r[2]);
			$filters = explode("|", substr($r[3], 1));
			$ret = array_reduce($filters, function($a, $b) { return "$b($a)";}, $r[1]==''? '$x':"\$x['{$r[1]}$path']");
			return $ret;
		};
		
		$obr_text = function($r) use ($obr) {
			return "', ".$obr($r).", '";
		};

		$obr_escape = function($r) use ($obr_text) {
			$r[3] = "|escapeHTML".$r[3];
			return $obr_text($r);
		};
		
		$html = preg_replace_callback('/\{\{'.$reg_s.'\}\}/', $obr_escape, $html);
		$html = preg_replace_callback('/\{%'.$reg_s.'%\}/', $obr_text, $html);
		
		$html = preg_replace_callback('/<for\s+(\w+)='.$reg.'\s*>/', function($r) use ($obr) {
			$i = $r[1];
			array_shift($r);
			$x = $obr($r);
			return "'], array_reduce($x, function(\$arr, \$i) use (\$x) { \$x['$i'] = \$i; return array_merge(\$arr, ['";
		}, $html);
		$html = preg_replace_callback('/<\/for>/', function($r) use (&$arr) {
			return "']); }, []), ['";
		}, $html);
		
		$html = preg_replace_callback('/<if\s+(not\s+)?'.$reg.'\s*>/', function($r) use ($obr) {
			$not = $r[1];
			array_shift($r);
			return "'], (".($not? '!': '').$obr($r)."? ['";
		}, $html);
		$html = preg_replace_callback('/<\/if>/', function($r) use (&$arr) {
			return "']: []), ['";
		}, $html);
		
		$html = preg_replace_callback('/<link\s+([\w\.\/-]+)>/', function($r) {
			$real_path = $path = $r[1];	
			$ext = file_ext($path);
			if($path[0] == "/") $path = "www$path";
			
			if($ext == "coffee") return "\n<script>\n'], \$c->tmpl('$path', \$argv, \$x), ['\n</script>\n";
			if($ext == "js") return "\n<script>\n'], \$c->tmpl('$path', \$argv, \$x), ['\n</script>\n";
			if($ext == "css") return "\n<style>\n'], \$c->tmpl('$path', \$argv, \$x), ['\n</style>\n";
			if($ext == "html") return "'], \$c->tmpl('$path', \$argv, \$x), ['";

			#throw new Exception("Вызов контроллера ещё не реализован. link: $path");
			return "'], [\$c->urlRun('$real_path', \$argv, \$x)], ['";
		}, $html);

		return $html;
	}
	
	
}