<?php

/**
Èñêëş÷åíèå ïğîåêòà
*/

class AException extends Exception {
	
	public $data;
	
	function __construct($message="", $code=0, $data=null) {
        parent::__construct($message, $code);
		$this->data = $data;
    }
	function getData(){
		return $this->data;
	}
	
}