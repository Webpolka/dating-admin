## Вставить в тинкер для создания 120 фейковых соообщений в чате

```bash
// === 120 СООБЩЕНИЙ В ЧАТЕ  — строгая последовательность ===

 $chatId = 12;
 $chat = \App\Models\Chat::find($chatId);
if (!$chat) {
    echo "Чат #{$chatId} не найден!\n";
    exit;
}

 $participants = $chat->participants()->with('user')->get()->pluck('user');
if ($participants->count() < 2) {
    echo "В чате меньше двух участников!\n";
    exit;
}

 $u1 = $participants[0];
 $u2 = $participants[1];
echo "Чат #{$chat->id}\n";
echo "Юзер 1: #{$u1->id} {$u1->name}\n";
echo "Юзер 2: #{$u2->id} {$u2->name}\n\n";

// Базовое время: 10 минут назад. Каждое следующее сообщение +1 секунда.
// Сообщение #1 → baseTime+1s (самое старое)
// Сообщение #120 → baseTime+120s (самое новое)
 $baseTime = now()->subMinutes(10);
 $count = 0;

for ($i = 1; $i <= 120; $i++) {
    $sender = ($i % 2 === 0) ? $u1 : $u2;
    $time = $baseTime->copy()->addSeconds($i);

    // DB::table — обходим Eloquent, чтобы created_at не перезаписался
    \DB::table('messages')->insert([
        'chat_id'    => $chat->id,
        'sender_id'  => $sender->id,
        'type'       => 'text',
        'body'       => "Сообщение #{$i} (от " . ($sender->id === $u1->id ? 'Юзера1' : 'Юзера2') . ")",
        'status'     => 'approved',
        'created_at' => $time,
        'updated_at' => $time,
    ]);
    $count++;
}

// last_message_at = время последнего сообщения
 $chat->update(['last_message_at' => $baseTime->copy()->addSeconds(120)]);
\Cache::forget('admin_chat_stats');

echo "Создано {$count} сообщений\n";
echo "Последовательность: #1 (самое старое) → #120 (самое новое)\n\n";
echo "Проверка подгрузки:\n";
echo "- Открой чат → увидишь #71–#120 (последние 50)\n";
echo "- «Загрузить ещё» → подгрузятся #21–#70\n";
echo "- «Загрузить ещё» ещё раз → подгрузятся #1–#20\n";
echo "- Кнопка исчезнет\n";
exit;
```