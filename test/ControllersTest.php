<?php
require_once 'lib/UnitCase.php';
require_once 'lib/App.php';
require_once 'lib/Utils.php';

class ControllersTest extends UnitCase {
	function setUp() {
		parent::setUp();
		$this->controllers = (new App)->init()->controllers;
	}
	
	function testValues() {
		$this->assertFalse((bool) $this->controllers->menuInfo["Таблицы  → realty"]);
		$this->controllers->getTableInfo();
		$this->controllers->buildref();
		$this->assertFalse((bool) $this->controllers->menuInfo["Таблицы  → realty"]);
	}
	
	function testTemplate() {
		$controllers = $this->controllers;
		
		$code = $controllers->build_tmpl("a {{ a.x }} ");
		$this->assertEquals($code, "a ', escapeHTML(\$x['a']['x']), ' ");
		
		$code = $controllers->build_tmpl("a {% a.x %} ");
		$this->assertEquals($code, "a ', (\$x['a']['x']), ' ");
		
		$code = $controllers->build_tmpl("a {% a.x|work %} ");
		$this->assertEquals($code, "a ', work(\$x['a']['x']), ' ");
		
		$code = $controllers->build_tmpl(" <link www/addimage.html> ");
		$this->assertEquals($code, " '], \$c->tmpl('www/addimage.html', \$argv, \$x), [' ");
		
		$argv = (object) ["F"=>[], "app"=>$controllers->app];
		$code = $controllers->tmpl("www/addimage.html", $argv, []);
		$this->assertTrue((bool) $argv->F);
		
		$code = $controllers->build_tmpl(" <for i=u> m={{ i }} </for> ");
		$this->assertEquals($code, " '], array_reduce((\$x['u']), function(\$arr, \$i) use (\$x) { \$x['i'] = \$i; return array_merge(\$arr, [' m=', escapeHTML(\$x['i']), ' ']); }, []), [' ");
		$x = [u=>[1, 2, 3]];
		eval("\$ret = join('', array_merge(['$code']));");
		$this->assertEquals($ret, "  m=1  m=2  m=3  ");
		
		$code = $controllers->build_tmpl(" <if i.u> m={{ i.u }} </if> ");
		$this->assertEquals($code, " '], ((\$x['i']['u'])? [' m=', escapeHTML(\$x['i']['u']), ' ']: []), [' ");
		$x = [i=>[u=>2]];
		eval("\$ret = join('', array_merge(['$code']));");
		$this->assertEquals($ret, "  m=2  ");
		
		$code = $controllers->build_tmpl(" <if not i.u> m={{ i.u }} </if> ");
		$this->assertEquals($code, " '], (!(\$x['i']['u'])? [' m=', escapeHTML(\$x['i']['u']), ' ']: []), [' ");
		$x = [i=>[u=>2]];
		eval("\$ret = join('', array_merge(['$code']));");
		$this->assertEquals($ret, "  ");
		
		/*# проверяем coffee
		$path = "log/test";
		file_put_contents("$path.coffee", "import {$path}1.coffee\nx++");
		file_put_contents("{$path}1.coffee", "x=10");
		file_put_contents("$path.html", "<link $path.coffee> x");
		$ret = join('', $controllers->tmpl("$path.html", $argv, []));
		$this->assertEquals($ret, "\n<script>
// import log/test.coffee
(function() {
// import log/test1.coffee
(function() {
  var x;

  x = 10;

}).call(this);


  x++;

}).call(this);

</script>
 x");
		
		unlink("$path.coffee");
		unlink("$path.html");
		unlink("{$path}1.coffee");
		*/
	}
	
	public function testRun() {
		$ret = $this->controllers->run((object) [url => "/api/__NOT_FOUND__"]);
		$ret = json_decode($ret);
        $this->assertEquals($ret->error, 100);
		
		$ex = [
			desc => "тестовый контроллер",
			access=> "all", 
			param => ["i" => "string"], 
			func => function($param, $controller) {
				$controller->OUTHEAD["ps"] = "ps1";
				return $controller->param["i"];
			}
		];
		
		$this->controllers->add(["load" => $ex, "ex" => $ex]);
		$this->controllers->sync();	// синхронизируем с базой
		$this->controllers->initModel(); // нужно для протокола
		
		$ret = $this->controllers->run((object)[url=>"/api/load", param=>[i => 10], HEAD=>[], OUTHEAD=>&$OUTHEAD]);
		
		$this->assertEquals($ret, 10);
        $this->assertEquals($OUTHEAD["ps"], "ps1");
		
		/*$controllers = $this->controllers->controllers;
		$this->controllers->run((object)[url=>"/api/ex", param=>[i => 10], HEAD=>[], OUTHEAD=>&$OUTHEAD]);
		$beans = $controllers["ex"]["control"]->ownProtocol;
		$this->assertEquals(count($beans), 1); 
		list($idx, $bean) = each($beans); 
		$bean;
		$this->assertEquals(count($controllers["load"]["control"]->ownProtocol), 0);
		*/
    }
}