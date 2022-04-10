<?php

/**
Gallery - это плагин для галереи обекта недвижимости
*/
//удаляет устаревшие фотографии для комментариев
$app->cron(mktime(0, 0, 0), 24*60*60, function() {
	$img_old = R::find("img_temp", "time_add < ?", [time()-24*60*60]);
		foreach ($img_old as $value){
			$img = R::load("img", $value->img_id);
			$img_temp = R::load("img_temp", $value->id);
			R::trash($img_temp);
			R::trash($img);
		}
}, true);

$app->bind("realty-load", function($app, &$data) {
    $data["imgs"] = $this->app->controllers->lightRun("gallery/list/load", $this, [id => $data["id"], offset => 0, limit => 6]);
});

//функция сортировки картинок
function sort_img($param, $argv, $table, $where){
	$id = $param->id;
	$arr_before = [$param->before, $id];
	$arr_target = [$param->target, $id];
	$arr_img_realty = [$id];
	if ($where) {
		$arr_before[] = $argv->session->user->id;
		$arr_target[] = $argv->session->user->id;
		$arr_img_realty [] = $argv->session->user->id;
	}

	if($param->before) $before = R::findOne($table, "img_id=? and realty_id=? ".$where, $arr_before)->id;
	else $before = 0;
	$target = R::findOne($table, "img_id=? and realty_id=? ".$where, $arr_target)->id;
	
	if($before < $target) {
		$before++;
		$wh = "$before and $target order by id";
	} else $wh = "$target and $before order by id desc";

	$img_realty = R::find($table, "realty_id=? ".$where." and id between $wh", $arr_img_realty);
		
	$img_id = null;
	foreach($img_realty as $bean) {
		$tmp = $bean->img_id;
		$bean->img_id = $img_id;
		$img_id = $tmp;
		R::store($bean);			
	}
	
	reset($img_realty);
	list($key, $bean) = each($img_realty);
	$bean->img_id = $param->target;
	R::store($bean);
	return [];

}
$controllers->add([
	/************************************* img *************************************/
	"gallery/list/load" => [
		desc => "возвращает по id объекта фотографии",
		access => "all",
		model => "realty",
		param => ["id"=>"id", offset=>'offset_by', limit=>'limit_by'],
		func => function($param, $argv) {
			$ret['id'] = R::getCol("select img_id from img_realty where realty_id=? order by id".$param->offset.$param->limit , [$param->id]);
			$ret['counter'] = R::getCell("select count(id) from img_realty where realty_id=?",[$param->id]);
			return $ret;
		},
	],
	"gallery/store" => [
		desc => "сохраняет фотографии недвижимости",
		access => "self",
		model => "realty",
		param => ["img" => "files", "id"=>"id"],
		func => function($param, $argv) {
			$realty = $argv->model;
			$add = [];
			foreach($param->img as $photo) {
				$img = R::dispense("img");
				$img->sharedRealty[] = $realty;
				$img->save($photo[0]);
				$add[] = $img->id;
			}
			return $add;
		},
	],
	"gallery/erase" => [
		desc => "удаляет фотографию недвижимости",
		access => "self",
		model => "realty",			# проверяем, чтобы img принадлежала этому пользователю
		param => ["id" => "id", "img_id" => "id"],	# не нужно нам новой модели
		func => function($param, $argv) {
			R::trash($argv->model->sharedImg[$param->img_id]);
		}
	],
	"gallery/comment/erase" => [//сделать удаление фотографии
		desc => "удаляет фотографию в комментарии",
		access => "authall",		# проверяем, чтобы img принадлежала этому пользователю
		param => ["id" => "id", "img_id" => "id"],	# не нужно нам новой модели
		func => function($param, $argv) {
			$img_temp = R::findOne("img_temp", "img_id = ? and realty_id = ? and user_id = ?", [$param->img_id, $param->id, $argv->session->user->id]);
			$img = R::findOne("img", "id=?",[$param->img_id]);
			R::trash($img);
			R::trash($img_temp);
		}
	],
	"gallery/comment/store" =>[
		desc => "добавляет фотографии к комментариям",
		access => "authall",
		model => "realty",
		param => ["id"=>"id", "img" => "files"],
		func => function($param, $argv) {
			$add = [];
			foreach($param->img as $photo) {
				$img = R::dispense("img");
				$img->save($photo[0]);
				$realty = R::load("realty", $param->id);
				$user = R::load("user", $argv->session->user->id);
				$img_temp = R::dispense("img_temp");
				$img_temp->img = $img;
				$img_temp->realty = $realty;
				$img_temp->user = $user;
				$img_temp->time_add = time();
				R::store($img_temp);
				$add[] = $img->id;
			}
			return $add;
		},
	],
	"gallery/sort" => [
		desc => "сортирует фотографии недвижимости",
		access => "self",
		model => "realty",			# проверяем, чтобы img принадлежала этому пользователю
		param => ["id" => "id", "target" => "id", "before" => "uint"],	# не нужно нам новой модели
		func => function($param, $argv) {	# переставляем
			sort_img($param, $argv, "img_realty");
		}
	],
	"gallery/comment/sort"=>[
		desc => "сортирует фотографии в комментариях",
		access => "authall",
		param => ["id" => "id", "target" => "id", "before" => "uint"],	# не нужно нам новой модели
		func => function($param, $argv) {	# переставляем
			sort_img($param, $argv, "img_temp", "and user_id=?");
		}
	],
	"gallery/description/load" => [
		desc => "удаляет фотографию недвижимости",
		access => "all",
		param => ["img_id" => "id"],	# не нужно нам новой модели
		func => function($param, $argv) {
			$img = R::load("img", $param->img_id); 
			$ret = $img->export();
			return $ret;
		}
	],
	"gallery/desc/store"=>[
		desc => "Добавляет комментарий к фотографии",
		access => "self",
		model => "realty",
		param => ["id"=>"id", "img_id" => "id", "desc"=>"string"],	# не нужно нам новой модели
		func => function($param, $argv) {	# переставляем
			$img = R::load("img", $param->img_id);
			$img->description = $param->desc;
			R::store($img);
			return [];
		}
	],
]);
