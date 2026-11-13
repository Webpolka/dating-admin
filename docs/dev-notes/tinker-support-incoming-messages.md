 $chatId = 15;
 $count = 5;
 $interval = 1500000;
 $chat = \App\Models\Chat::find($chatId);
if (!$chat) { echo "Чат не найден\n"; return; }
 $userParticipant = $chat->participants()->whereHas('user', fn($q) => $q->whereNotIn('role', ['admin', 'moderator', 'support']))->first();
 $user = $userParticipant?->user;
if (!$user) { echo "Юзер не найден\n"; return; }
echo "Чат #{$chat->id} | Юзер: #{$user->id} {$user->name}\n";
for ($i = 1; $i <= $count; $i++) {
    $msg = $chat->messages()->create(['sender_id' => $user->id, 'type' => 'text', 'body' => "Входящее #{$i} от {$user->name}", 'status' => 'approved']);
    $chat->update(['last_message_at' => now()]);
    echo "#{$i} отправлено\n";
    if ($i < $count) usleep($interval);
}
echo "Готово!\n";