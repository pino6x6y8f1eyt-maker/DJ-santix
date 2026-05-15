async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    console.log('🧱 Entrando a playSong con:', song?.title);

    if (!song) {
        console.log('🧱 No hay song, me salgo del canal');
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    try {
        console.log('🧱 Intentando sacar stream de:', song.url);
        const stream = await play.stream(song.url);
        console.log('🧱 Stream conseguido, tipo:', stream.type);

        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);
        console.log('🧱 Audio mandado al player');

        const embed = new EmbedBuilder()
          .setColor('#FF4500')
          .setTitle('🧱 ¡SONANDO AHORA!')
          .setDescription(`**${song.title}**`)
          .addFields({ name: 'Duración', value: song.duration, inline: true }, { name: 'La puso', value: song.requestedBy, inline: true })
          .setFooter({ text: '¡DonCuboDJ! - El DJ de panas.bxngh.lol' });

        serverQueue.textChannel.send({ embeds: [embed] });

        serverQueue.player.on(AudioPlayerStatus.Idle, () => {
            console.log('🧱 Rola terminó, sigue la siguiente');
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });

        serverQueue.player.on('error', error => {
            console.error('🧱 ERROR DEL PLAYER:', error);
            serverQueue.textChannel.send('🧱 Me dio amsiedad el audio pa, se crasheó el player');
        });

    } catch (error) {
        console.error('🧱 ERROR AL SACAR STREAM:', error);
        serverQueue.textChannel.send('🧱 No pude sacar audio de ese link pa. YouTube anda de tóxico.');
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    }
}