sender.send('progress', { current: e.task, total: e.total, type: 'game-download' });
    });

await launcher.launch(opts);
}

module.exports = { launchGame };
