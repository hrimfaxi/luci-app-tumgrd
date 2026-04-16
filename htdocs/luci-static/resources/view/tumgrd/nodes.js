'use strict';
'require view';
'require rpc';
'require ui';

var callStatus = rpc.declare({
	object: 'tumgrd',
	method: 'status',
	params: [],
	expect: { nodes: [] }
});

var callDump = rpc.declare({
	object: 'tumgrd',
	method: 'dump',
	params: [],
	expect: { nodes: [] }
});

var callRegister = rpc.declare({
	object: 'tumgrd',
	method: 'register',
	params: [ 'uid', 'server_host', 'server_port', 'client_port', 'psk', 'memlimit', 'description', 'client_comment', 'ip_check_url', 'ip_version' ],
	expect: { code: 0, message: '' }
});

var callDeregister = rpc.declare({
	object: 'tumgrd',
	method: 'deregister',
	params: [ 'uid', 'server_host', 'server_port' ],
	expect: { code: 0, message: '' }
});

var callRefresh = rpc.declare({
	object: 'tumgrd',
	method: 'refresh',
	params: [ 'uid', 'server_host', 'server_port', 'force', 'all' ],
	expect: { code: 0, message: '' }
});

function parseRows(res) {
	if (!res)
		return [];

	if (Array.isArray(res))
		return res;

	if (Array.isArray(res.nodes))
		return res.nodes;

	if (Array.isArray(res.data))
		return res.data;

	return [];
}

function assertUbusOk(res, fallback) {
	if (!res)
		throw new Error(fallback || 'operation failed');

	if (res.code === undefined || res.code === 0)
		return res;

	throw new Error(res.message || res.error || fallback || 'operation failed');
}

function copyObject(src) {
	var out = {};
	var k;

	if (!src)
		return out;

	for (k in src)
		out[k] = src[k];

	return out;
}

function nodeKey(n) {
	return String(n.uid || '') + '\x1f' +
		String(n.server_host || '') + '\x1f' +
		String(n.server_port || '');
}

function mergeRows(statusRows, dumpRows) {
	var map = {};
	var rows = [];
	var i, k, row, key;

	for (i = 0; i < dumpRows.length; i++) {
		row = copyObject(dumpRows[i]);
		key = nodeKey(row);
		map[key] = row;
		rows.push(row);
	}

	for (i = 0; i < statusRows.length; i++) {
		row = statusRows[i];
		key = nodeKey(row);

		if (map[key]) {
			for (k in row)
				map[key][k] = row[k];
		}
		else {
			map[key] = copyObject(row);
			rows.push(map[key]);
		}
	}

	return rows;
}

function fmtTime(ts) {
	if (!ts)
		return '';

	try {
		return new Date(ts * 1000).toLocaleString();
	}
	catch (e) {
		return String(ts);
	}
}

function reloadSoon() {
	window.setTimeout(function() {
		location.reload();
	}, 500);
}

function renderPSKCell(psk) {
	if (!psk)
		return E('td', { 'class': 'td' }, '');

	var visible = false;
	var textNode = E('span', {}, '********');
	var btn = E('button', {
		'class': 'btn cbi-button cbi-button-action',
		'style': 'margin-left: .5em;',
		'click': function(ev) {
			ev.preventDefault();

			visible = !visible;
			textNode.textContent = visible ? psk : '********';
			btn.textContent = visible ? _('Hide') : _('Show');
		}
	}, _('Show'));

	return E('td', { 'class': 'td' }, [
		textNode,
		btn
	]);
}

function renderTable(ctx, rows) {
	var table = E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th' }, _('UID')),
			E('th', { 'class': 'th' }, _('Server Host')),
			E('th', { 'class': 'th' }, _('Server Port')),
			E('th', { 'class': 'th' }, _('Client Port')),
			E('th', { 'class': 'th' }, _('PSK')),
			E('th', { 'class': 'th' }, _('Memlimit')),
			E('th', { 'class': 'th' }, _('Description')),
			E('th', { 'class': 'th' }, _('Client Comment')),
			E('th', { 'class': 'th' }, _('IP Check URL')),
			E('th', { 'class': 'th' }, _('IP Version')),
			E('th', { 'class': 'th' }, _('Current IP')),
			E('th', { 'class': 'th' }, _('Updated')),
			E('th', { 'class': 'th' }, _('Status')),
			E('th', { 'class': 'th' }, _('Actions'))
		])
	]);

	rows.forEach(function(n) {
		var actionCell = E('td', { 'class': 'td' }, [
			E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': ui.createHandlerFn(ctx, function() {
					return callRefresh(n.uid, n.server_host, n.server_port, false, false).then(function(res) {
						assertUbusOk(res, 'refresh failed');
						ui.addNotification(null, E('p', _('Refresh success')));
						reloadSoon();
					}).catch(function(err) {
						ui.addNotification(null, E('p', String(err)), 'error');
					});
				})
			}, _('Refresh')),
			' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-negative',
				'click': ui.createHandlerFn(ctx, function() {
					if (!confirm(_('Are you sure to deregister this node?')))
						return;

					return callDeregister(n.uid, n.server_host, n.server_port).then(function(res) {
						assertUbusOk(res, 'deregister failed');
						ui.addNotification(null, E('p', _('Deregister success')));
						reloadSoon();
					}).catch(function(err) {
						ui.addNotification(null, E('p', String(err)), 'error');
					});
				})
			}, _('Deregister'))
		]);

		table.appendChild(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td' }, n.uid || ''),
			E('td', { 'class': 'td' }, n.server_host || ''),
			E('td', { 'class': 'td' }, String(n.server_port || '')),
			E('td', { 'class': 'td' }, String(n.client_port || '')),
			renderPSKCell(n.psk),
			E('td', { 'class': 'td' }, String(n.memlimit || '')),
			E('td', { 'class': 'td' }, n.description || ''),
			E('td', { 'class': 'td' }, n.client_comment || ''),
			E('td', { 'class': 'td' }, n.ip_check_url || ''),
			E('td', { 'class': 'td' }, n.ip_version || ''),
			E('td', { 'class': 'td' }, n.current_ip || ''),
			E('td', { 'class': 'td' }, fmtTime(n.last_updated)),
			E('td', { 'class': 'td' }, n.status || ''),
			actionCell
		]));
	});

	return table;
}

return view.extend({
	load: function() {
		return Promise.all([
			callStatus(),
			callDump()
		]);
	},

	handleRegister: function(ev) {
		ev.preventDefault();

		var uid = document.getElementById('tumgrd_uid').value.trim();
		var host = document.getElementById('tumgrd_server_host').value.trim();
		var sport = parseInt(document.getElementById('tumgrd_server_port').value, 10);
		var cport = parseInt(document.getElementById('tumgrd_client_port').value, 10);
		var psk = document.getElementById('tumgrd_psk').value;
		var memlimitText = document.getElementById('tumgrd_memlimit').value.trim();
		var description = document.getElementById('tumgrd_description').value.trim();
		var clientComment = document.getElementById('tumgrd_client_comment').value.trim();
		var ipCheckUrl = document.getElementById('tumgrd_ip_check_url').value.trim();
		var ipVersion = document.getElementById('tumgrd_ip_version').value;
		var memlimit = memlimitText ? parseInt(memlimitText, 10) : 0;

		if (!uid || !host || isNaN(sport) || isNaN(cport) || !psk) {
			ui.addNotification(null, E('p', _('Required fields are missing')), 'error');
			return;
		}

		return callRegister(
			uid,
			host,
			sport,
			cport,
			psk,
			memlimit,
			description || '',
			clientComment || '',
			ipCheckUrl || '',
			ipVersion || 'auto'
		).then(function(res) {
			assertUbusOk(res, 'register failed');
			ui.addNotification(null, E('p', _('Register success')));
			reloadSoon();
		}).catch(function(err) {
			ui.addNotification(null, E('p', String(err)), 'error');
		});
	},

	handleRefreshAll: function(force) {
		return callRefresh('', '', 0, !!force, true).then(function(res) {
			assertUbusOk(res, 'refresh all failed');
			ui.addNotification(null, E('p', force ? _('Force refresh all success') : _('Refresh all success')));
			reloadSoon();
		}).catch(function(err) {
			ui.addNotification(null, E('p', String(err)), 'error');
		});
	},

	render: function(data) {
		var statusRows = parseRows(data[0]);
		var dumpRows = parseRows(data[1]);
		var rows = mergeRows(statusRows, dumpRows);

		return E('div', {}, [
			E('div', {
				'style': 'display:flex; justify-content:space-between; align-items:center; gap:1em; flex-wrap:wrap;'
			}, [
				E('h2', { 'style': 'margin:0;' }, _('Tumgrd Nodes')),
				E('div', {}, [
					E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, function() {
							return this.handleRefreshAll(false);
						})
					}, _('Refresh All')),
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-action important',
						'click': ui.createHandlerFn(this, function() {
							return this.handleRefreshAll(true);
						})
					}, _('Force Refresh All'))
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Register Node')),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('UID')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_uid', 'class': 'cbi-input-text' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Server Host')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_server_host', 'class': 'cbi-input-text' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Server Port')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_server_port', 'class': 'cbi-input-text', 'type': 'number' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Client Port')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_client_port', 'class': 'cbi-input-text', 'type': 'number' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('PSK')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_psk', 'class': 'cbi-input-password', 'type': 'password' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Memlimit')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_memlimit', 'class': 'cbi-input-text', 'type': 'number' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Description')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_description', 'class': 'cbi-input-text' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Client Comment')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'tumgrd_client_comment', 'class': 'cbi-input-text' })
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('IP Check URL')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'id': 'tumgrd_ip_check_url',
							'class': 'cbi-input-text',
							'placeholder': 'http://ip.3322.net'
						})
					])
				]),

				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('IP Version')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', { 'id': 'tumgrd_ip_version', 'class': 'cbi-input-select' }, [
							E('option', { 'value': 'auto' }, _('auto')),
							E('option', { 'value': 'ipv4' }, _('ipv4')),
							E('option', { 'value': 'ipv6' }, _('ipv6'))
						])
					])
				]),

				E('div', { 'class': 'right' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, 'handleRegister')
					}, _('Register'))
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Nodes')),
				rows.length ? renderTable(this, rows) : E('em', {}, _('No nodes found'))
			])
		]);
	}
});
