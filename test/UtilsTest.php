<?php
require_once 'lib/UnitCase.php';
require_once 'lib/Utils.php';


class UtilsTest extends UnitCase {
	
	function testUtils() {
		# преобразование набора бинов в массив
		$beans = R::find("role", "true limit 1");
		$rows = exportToRows($beans, ["sharedUser"]);
		$this->assertEquals($rows[0][0], "id");
		$this->assertEquals($rows[0][1], "name");
		$this->assertTrue(is_array($rows[0][2]));
		$this->assertEquals($rows[0][2][0], "sharedUser");
		$this->assertEquals("&amp;&apos;&quot;&lt;&gt;", escapeHTML('&\'"<>'));
		
		$this->assertEquals(ip2maxmind("127.0.0.1"), ip2long("127.0.0.1"));
		#print ip2maxmind("212.116.103.130");
		$this->assertEquals(ip2maxmind("212.116.103.130"), ip2long("212.116.103.130") + 4294967296);
		$this->assertEquals(ip2maxmind("255.255.255.255"), ip2long("255.255.255.255") + 4294967296);
	}

}