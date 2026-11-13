 $chatId = 13;
 $count = 10;
 $interval = 1500000;
 $chat = \App\Models\Chat::find($chatId);
if (!$chat) { echo "Чат не найден\n"; return; }
if ($chat->type !== 'private') { echo "Не private чат\n"; return; }
 $participants = $chat->participants()->with('user')->get()->pluck('user')->filter(fn($u) => $u && !$u->isStaff())->values();
if ($participants->count() < 2) { echo "Нет 2 юзеров-участников\n"; return; }
 $u1 = $participants[0];
 $u2 = $participants[1];
echo "Чат #{$chat->id} | u1: #{$u1->id} {$u1->name} | u2: #{$u2->id} {$u2->name}\n";
for ($i = 1; $i <= $count; $i++) {
    $sender = $i % 2 === 1 ? $u1 : $u2;
    $msg = $chat->messages()->create(['sender_id' => $sender->id, 'type' => 'text', 'body' => "Тест #{$i} от {$sender->name}", 'status' => 'approved']);
    $chat->update(['last_message_at' => now()]);
    echo "#{$i} от {$sender->name}: {$msg->body}\n";
    if ($i < $count) usleep($interval);
}
echo "Готово!\n";