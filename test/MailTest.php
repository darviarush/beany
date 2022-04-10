<?php
require_once 'lib/UnitCase.php';
require_once 'lib/Mail.php';


class MailTest extends UnitCase {

	function setUp() {
		parent::setUp();
		$this->mail = (new App([email=>[test=>1]]))->init()->mail;
	}

	function testMail() {
		$mail = $this->mail;
		$mail->parse("ex", '$px 22 $ex 10');
		$this->assertEquals(count($mail->tmpl["ex"]), 2);
		$this->assertEquals(count($mail->tmpl["ex"][0]), 2);
		$this->assertEquals(count($mail->tmpl["ex"][1]), 3);
		$this->assertEquals($mail->tmpl["ex"][0][0], "px");
		$this->assertEquals($mail->tmpl["ex"][0][1], "ex");
		$this->assertEquals($mail->tmpl["ex"][1][0], "");
		$this->assertEquals($mail->tmpl["ex"][1][1], " 22 ");
		$this->assertEquals($mail->tmpl["ex"][1][2], " 10");
		
		$mail->send("ex", [px=>"PX", ex=>"EX"]);
		$this->assertEquals(file_get_contents("log/email.msg"), "PX 22 EX 10");
	}
}