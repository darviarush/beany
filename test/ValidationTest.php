<?php
require_once 'PHPUnit/Autoload.php';
require_once 'lib/Validation.php';
require_once 'lib/App.php';

class ValidationTest extends PHPUnit_Framework_TestCase {

	function setUp() {
	}

    public function testValid() {
	
		$validation = new Validation(new App);
		
		$param = [i=>"35", f=>"3.3", s=>"57"];
		$argv = (object) [param=>&$param];
		$validation->valid([i=>"int", f=>"double", s=>"string"], $argv);

		$this->assertInternalType("float", $param["f"]);
		$this->assertInternalType("int", $param["i"]);
		$this->assertInternalType("string", $param["s"]);
		
		$param = [f=>"3.3", s=>"57"];
		try {
			$validation->valid([i=>"int", f=>"double", s=>"string"], $argv);
			$this->fail();
		} catch(AException $e) {
			$this->assertEquals($e->getCode(), 402);
		}
		
		# Лишние никак не обрабатываются
		$param = [i=>"35", f=>"3.3", s=>"57"];
		$validation->valid([f=>"double", s=>"string"], $argv);
		
		# не пропускает  email2=>"Андрей@Андреевич.рф"
		$param = [email=>"a@nix.ps.p-21.com", id=>1, password=>"qwerty"];
		$type = [email=>email, id=>id, password=>password];
		$validation->valid($type, $argv);
    }
}
