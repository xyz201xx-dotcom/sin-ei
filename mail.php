<?php
declare(strict_types=1);
header('Content-Type: text/html; charset=UTF-8');
$to='YOUR_EMAIL@example.com'; // 実際の受信先メールアドレスへ変更
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('直接アクセスできません。');}
function c(string $v):string{return trim(str_replace(["\r","\0"],'',$v));}
$name=c($_POST['name']??'');$tel=c($_POST['tel']??'');$email=filter_var(c($_POST['email']??''),FILTER_VALIDATE_EMAIL);$message=c($_POST['message']??'');
if($name===''||!$email||$message===''){http_response_code(400);exit('入力内容をご確認ください。');}
$subject=mb_encode_mimeheader('【ホームページ】お問い合わせ','UTF-8');
$body="お名前：{$name}\n電話番号：{$tel}\nメール：{$email}\n\nお問い合わせ内容：\n{$message}\n";
$headers='From: website@'.($_SERVER['SERVER_NAME']??'localhost')."\r\nReply-To: {$email}\r\nContent-Type: text/plain; charset=UTF-8";
if(!mail($to,$subject,$body,$headers)){http_response_code(500);exit('送信に失敗しました。電話でお問い合わせください。');}
?><!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>送信完了</title><style>body{font-family:sans-serif;background:#edf6ff;color:#172033}.box{max-width:620px;margin:12vh auto;background:#fff;padding:45px;border-radius:18px;text-align:center}h1{color:#0757b7}a{display:inline-block;background:#0757b7;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none}</style><main class="box"><h1>送信が完了しました</h1><p>お問い合わせありがとうございます。内容を確認後、ご連絡します。</p><a href="index.html">ホームへ戻る</a></main></html>
