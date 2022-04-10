<?php

# �������� � �������� logo, ���������� �������� ������ �� www/theme/images/places

class Logo {
	public $app;
	
	# �����������
	function __construct($app) {
		$this->app = $app;
	}

	# �������������� ������� logo � ������
	function sync() {
		$dir = opendir("www/theme/images/places");
		while($file = readdir($dir)) {
			if($file[0] == '.') continue;
			$crc[] = $crc32 = crc32($file);
			$files[$crc32] = $file;
		}
		
		R::exec("delete from logo where crc not in (".join(",", $crc).")");
		$crc = R::getCol("select crc from logo");
		foreach($crc as $crc32) unset($files[$crc32]);
		foreach($files as $crc32=>$file) {
			$ins[]= "(?,?,?)";
			if(!preg_match('/(\d+)\.\w+$/', $file, $m)) throw new Exception("���� www/theme/images/places/$file �� �������� place_id");
			$val[] = $m[1];
			$val[] = $crc32;
			$val[] = $file;
		}
		if($val) R::exec("insert into logo(place_id, crc, name) values ".join(",", $ins), $val);
	}
	
	
}