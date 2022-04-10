<?php
/**
 * Created by JetBrains PhpStorm.
 * User: a.guskov
 * Date: 20.06.12
 * Time: 15:22
 * To change this template use File | Settings | File Templates.
 */
 
class SMSException extends Exception {}
 
class SMS
{
    protected $host, $port, $url, $appname, $test;
    private $receivers=array();
    private $text="",$id=1;

    function __construct($app) {
    	$this->app = $app;
        //----
        $ini = $this->app->ini["sms"];
        $this->host = $ini["host"];
        $this->port = $ini["port"];
        $this->url = $ini["url"];
        $this->appname = $ini["appname"];
		$this->test = $ini["test"];
        //----
    }

    function setText($text)
    {
		$this->text = $text;
    }

    function setReceivers(array $res)
    {
        $this->receivers = $res;
    }

    function addReceiver($res)
    {
        $this->receivers[] = $res;
    }

    private function CheckReceivers()
    {
        if(!is_array($this->receivers))
            throw new SMSException("Свойство receivers класса SMS должно быть массивом");
        else
        {
            if(count($this->receivers)<1)
                throw new SMSException("Свойство receivers класса SMS должно быть заполнено перед отправкой");
            else
            {
                foreach($this->receivers as $k=>$v)
                {
                    $a = preg_match('^\+([0-9]{11})^',$v);
                    if(!isset($a))
                        throw new SMSException("Не верный формат номера получателя $v");
                }
            }
        }
    }

    private function CheckText()
    {
        if(!is_string($this->text))
            throw new SMSException("Свойство text класса SMS должно быть строкой");
        else
        {
            if(strlen($this->text)>256)
                throw new SMSException("Свойство text класса SMS должно быть не более 256 символов");
        }
    }

    private function PrepareReceivers()
    {
        $receivers = '"Receivers":[';
        $i=true;
        foreach($this->receivers as $k=>$r)
        {
            if($i===true)
            {
                $receivers .='"'.$r.'"';
                $i=false;
            }
            else
                $receivers .=',"'.$r.'"';

        }
        $receivers .= ']';
        return $receivers;
    }

    private function PrepareText()
    {
        return '"Text":"'.$this->text.'"';
    }

    private function PrepareSendParams()
    {
        return '"params":[{"App":"'.$this->appname.'",'.$this->PrepareReceivers().','.$this->PrepareText().'}]';
    }

    private function PrepareSendRequest()
    {
        return '{"method":"StoreSms",'.$this->PrepareSendParams().',"id":"'.$this->id.'"}';
    }

    function SendPrepeared()
    {
        $this->CheckReceivers();
        $this->CheckText();
        $this->SendData();

    }

    function Send($receivers,$text)
    {
		if($this->test) {
			if(is_array($receivers)) $receivers = join(", ", $receivers);
			file_put_contents('log/sms.msg', "$receivers: $text");
			return;
		}
        if(!is_array($receivers))
        {
            //кэширование будь оно не ладно!
            //$this->addReceiver($receivers);
            $this->setReceivers(array($receivers));
        }
        else
            $this->setReceivers($receivers);
        $this->setText($text);
        $this->SendPrepeared();
    }

    protected function SendData()
    {
        $request = $this->PrepareSendRequest();
        $data = $this->post_request($request);
        if($data['status']!='ok')
            throw new SMSException("Отправка смс не удалась, ошибка: ".$data['error']);
        else
        {
            $retrive = json_decode($data['content']);
            if(isset($retrive->error))
                throw new SMSException("Отправка смс не удалась, ошибка: ".$retrive->error->message);
        }
    }

    function post_request($data, $referer='') {

        // Convert the data array into URL Parameters like a=b&foo=bar etc.
        //$data = http_build_query($data);

        // parse the given URL
        //$url = parse_url($url);

        /*if ($url['scheme'] != 'http') {
            die('Error: Only HTTP request are supported !');
        }*/

        // extract host and path:
        //$host = $url['host'];
        //$path = $url['path'];

        // open a socket connection on port 80 - timeout: 30 sec
        $fp = fsockopen($this->host, $this->port, $errno, $errstr, 30);
        if ($fp){
            fputs($fp, "POST / HTTP/1.1\r\n");
            fputs($fp, "Host: $this->host\r\n");
            if ($referer != '')
                fputs($fp, "Referer: $referer\r\n");
            fputs($fp, "Content-type: application/json-rpc\r\n");
            fputs($fp, "Content-length: ". strlen($data) ."\r\n");
            fputs($fp, "Connection: close\r\n\r\n");
            fputs($fp, $data);
            $result = '';
            while(!feof($fp)) {
                // receive the results of the request
                $result .= fgets($fp, 256);
            }
        }
        else {
            return array(
                'status' => 'err',
                'error' => "$errstr ($errno)"
            );
        }

        // close the socket connection:
        fclose($fp);
        // split the result header from the content
        $result = explode("\r\n\r\n", $result, 2);
        $header = isset($result[0]) ? $result[0] : '';
        $content = isset($result[1]) ? $result[1] : '';
        // return as structured array:
        return array(
            'status' => 'ok',
            'header' => $header,
            'content' => $content
        );
    }
}

?>
