<?php
require_once 'lib/UnitCase.php';

class GalleryTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		$user = R::dispense("user");
        $realty = R::dispense("realty");
		
		$img_gallery = R::dispense("img");
		$img_gallery->description = "x";
		R::store($img_gallery);
		
		
		$img = R::dispense("img_temp");
		$img->img = $img_gallery;
		$img->realty = $realty;
		$img->user = $user;
		$img->time_add = time();
		R::store($img);
		
		R::freeze( true );
	}

    public function testGallery() {
		$app = self::$app;
        $app->plugins->loadOne("gallery");
		$controllers = $app->controllers;
		//$this->assertTrue(true);
		//создаем объект недвижимости
		$user = R::dispense("user"); 
		R::store($user);
		$session = Model_Session::new_session($user);
		
		$realty = R::dispense("realty");
		$realty->user = $user;
		R::store($realty);
		
		$argv = (object) [url=>"/api/gallery/list/load", param=>[id => $realty->id, offset=>1, limit=>1]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res["counter"], 0);
		
		/*$files = parseMultipartFormData('------------APcaMoZETsu3yv2TenIz59', file_get_contents("www/img.mht"));
		$argv = (object) [url=>"/api/gallery/store", param=>["id"=>$realty->id, "img"=>$files], cookie => [sess=>$session->hash]];
		$res = $controllers->controllerRun($argv);
		
		$argv = (object) [url=>"/api/gallery/store", param=>["id"=>$realty->id, "img"=>$files], cookie => [sess=>$session->hash]];
		$res = $controllers->controllerRun($argv);
		
		$argv = (object) [url=>"/api/gallery/list/load", param=>["id"=>$realty->id, offset=>1, limit=>1]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals(count($res), 1);*/
    }
}
