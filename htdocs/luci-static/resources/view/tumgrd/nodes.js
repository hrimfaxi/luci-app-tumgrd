'use strict';
'require view';
'require rpc';
'require ui';

// === RPC 声明 ===

var callDump = rpc.declare({
	object: 'tumgrd',
	method: 'dump',
	params: []
});

var callRegister = rpc.declare({
	object: 'tumgrd',
	method: 'register',
	params: [
		'uid', 'server_host', 'server_port', 'client_port', 'psk',
		'description', 'client_comment', 'memlimit', 'ip_check_url',
		'ip_version', 'xor'
	]
});

var callDeregister = rpc.declare({
	object: 'tumgrd',
	method: 'deregister',
	params: [ 'uid', 'server_host', 'server_port', 'ip_version' ]
});

var callRefresh = rpc.declare({
	object: 'tumgrd',
	method: 'refresh',
	params: [ 'uid', 'server_host', 'server_port', 'ip_version', 'force', 'all' ]
});

// === 工具函数 ===

function parseRows(res) {
	if (!res) return [];
	if (Array.isArray(res)) return res;
	if (Array.isArray(res.nodes)) return res.nodes;
	if (res.result && Array.isArray(res.result)) return res.result;
	if (res.result && Array.isArray(res.result.nodes)) return res.result.nodes;
	if (res.data && Array.isArray(res.data)) return res.data;
	if (res.data && Array.isArray(res.data.nodes)) return res.data.nodes;
	if (res[0] && Array.isArray(res[0].nodes)) return res[0].nodes;
	return [];
}

function assertUbusOk(res) {
	if (res == null) return res;
	if (res.code === 0) return res;
	if (res.status === 'ok') return res;
	if (res.success === true) return res;
	if (typeof res.error === 'string' && res.error) throw new Error(res.error);
	if (typeof res.message === 'string' && res.message &&
	    res.status !== 'ok' && res.code !== undefined && res.code !== 0)
		throw new Error(res.message);
	return res;
}

function fmtTime(ts) {
	if (!ts) return '';
	try {
		return new Date(ts * 1000).toLocaleString();
	} catch (e) {
		return String(ts);
	}
}

function reloadSoon() {
	window.setTimeout(function() { location.reload(); }, 500);
}

function generateXorKey() {
	var arr = new Uint8Array(64);
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		crypto.getRandomValues(arr);
	} else {
		for (var i = 0; i < 64; i++) {
			arr[i] = Math.floor(Math.random() * 256);
		}
	}
	return Array.from(arr, function(b) {
		return ('0' + b.toString(16)).slice(-2);
	}).join('');
}

function handleResult(promise, successMsg) {
	return promise.then(function(res) {
		assertUbusOk(res);
		if (successMsg) {
			ui.addNotification(null, E('p', _(successMsg)));
		}
		reloadSoon();
	}).catch(function(err) {
		ui.addNotification(null, E('p', String(err)), 'error');
	});
}

// === PSK 显示/隐藏 ===

function renderPSKCell(psk) {
	if (!psk) return E('td', { 'class': 'td' }, '');
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
	return E('td', { 'class': 'td' }, [ textNode, btn ]);
}

// === 表单构建 ===

function buildNodeForm(defaults) {
	defaults = defaults || {};

	return E('div', { 'class': 'cbi-section' }, [
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('UID')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_uid',
					'class': 'cbi-input-text',
					'value': defaults.uid || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Server Host')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_host',
					'class': 'cbi-input-text',
					'value': defaults.server_host || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Server Port')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_sport',
					'class': 'cbi-input-text',
					'type': 'number',
					'value': defaults.server_port || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Client Port')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_cport',
					'class': 'cbi-input-text',
					'type': 'number',
					'value': defaults.client_port || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('PSK')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_psk',
					'class': 'cbi-input-password',
					'type': 'password',
					'value': defaults.psk || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('XOR Key (hex)')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('div', { 'style': 'display: flex; gap: 0.5em; align-items: flex-start;' }, [
					E('textarea', {
						'id': 'modal_xor',
						'class': 'cbi-input-text',
						'style': 'flex: 1; height: 60px;',
						'placeholder': _('hex string, up to 64 bytes (128 hex chars)'),
						'rows': 3
					}, defaults.xor || ''),
					E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'style': 'white-space: nowrap;',
						'click': function(ev) {
							ev.preventDefault();
							var ta = document.getElementById('modal_xor');
							if (ta) {
								ta.value = generateXorKey();
							}
						}
					}, _('Generate'))
				])
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Memlimit (KB)')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_mem',
					'class': 'cbi-input-text',
					'type': 'number',
					'value': defaults.memlimit || 0
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Description')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_desc',
					'class': 'cbi-input-text',
					'value': defaults.description || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Client Comment')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_comment',
					'class': 'cbi-input-text',
					'value': defaults.client_comment || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('IP Check URL')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('input', {
					'id': 'modal_ipurl',
					'class': 'cbi-input-text',
					'placeholder': 'http://ip.3322.net',
					'value': defaults.ip_check_url || ''
				})
			])
		]),
		E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('IP Version')),
			E('div', { 'class': 'cbi-value-field' }, [
				E('select', { 'id': 'modal_ipver', 'class': 'cbi-input-select' }, [
					E('option', { 'value': 'auto' }, _('auto')),
					E('option', { 'value': 'ipv4' }, _('ipv4')),
					E('option', { 'value': 'ipv6' }, _('ipv6'))
				])
			])
		])
	]);
}

// === 提交逻辑 ===

function readNodeFormValues() {
	return {
		uid: document.getElementById('modal_uid').value.trim(),
		host: document.getElementById('modal_host').value.trim(),
		sport: parseInt(document.getElementById('modal_sport').value, 10),
		cport: parseInt(document.getElementById('modal_cport').value, 10),
		psk: document.getElementById('modal_psk').value,
		xor: document.getElementById('modal_xor').value.trim(),
		mem: parseInt(document.getElementById('modal_mem').value, 10) || 0,
		desc: document.getElementById('modal_desc').value.trim(),
		comment: document.getElementById('modal_comment').value.trim(),
		ipurl: document.getElementById('modal_ipurl').value.trim(),
		ipver: document.getElementById('modal_ipver').value
	};
}

function submitNodeForm(ctx, isEdit, defaults) {
	var v = readNodeFormValues();

	if (!v.uid || !v.host || isNaN(v.sport) || isNaN(v.cport) || !v.psk) {
		ui.addNotification(null, E('p', _('Required fields are missing')), 'error');
		return;
	}

	var action = isEdit
		? callDeregister(defaults.uid, defaults.server_host, defaults.server_port, defaults.ip_version)
		: Promise.resolve();

	handleResult(
		action.then(function() {
			return callRegister(
				v.uid, v.host, v.sport, v.cport, v.psk,
				v.desc, v.comment, v.mem, v.ipurl,
				v.ipver, v.xor
			);
		}),
		isEdit ? 'Node updated successfully' : 'Node registered successfully'
	);
}

// === 弹窗 ===

function showRegisterModal(ctx, defaultValues) {
	var isEdit = !!defaultValues;
	var defaults = defaultValues || {};

	ui.showModal(_(isEdit ? 'Edit Node' : 'Register Node'), [
		buildNodeForm(defaults),
		E('div', { 'class': 'right', 'style': 'margin-top: 1em;' }, [
			E('button', {
				'class': 'btn cbi-button cbi-button-reset',
				'click': function() { ui.hideModal(); }
			}, _('Cancel')),
			' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'click': ui.createHandlerFn(ctx, function() {
					submitNodeForm(ctx, isEdit, defaults);
				})
			}, _(isEdit ? 'Save' : 'Register'))
		])
	]);

	if (defaults.ip_version) {
		var sel = document.getElementById('modal_ipver');
		if (sel) sel.value = defaults.ip_version;
	}
}

function showEditModal(ctx, node) {
	showRegisterModal(ctx, {
		uid: node.uid,
		server_host: node.server_host,
		server_port: node.server_port,
		client_port: node.client_port,
		psk: node.psk,
		xor: node.xor || '',
		memlimit: node.memlimit,
		description: node.description,
		client_comment: node.client_comment,
		ip_check_url: node.ip_check_url,
		ip_version: node.ip_version
	});
}

// === 表格渲染 ===

function renderTable(ctx, rows) {
	var table = E('table', { 'class': 'table cbi-section-table' }, [
		E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th' }, _('UID')),
			E('th', { 'class': 'th' }, _('Server Host')),
			E('th', { 'class': 'th' }, _('Server Port')),
			E('th', { 'class': 'th' }, _('Client Port')),
			E('th', { 'class': 'th' }, _('PSK')),
			E('th', { 'class': 'th' }, _('XOR')),
			E('th', { 'class': 'th' }, _('Memlimit')),
			E('th', { 'class': 'th' }, _('Description')),
			E('th', { 'class': 'th' }, _('IP Version')),
			E('th', { 'class': 'th' }, _('Current IP')),
			E('th', { 'class': 'th' }, _('Updated')),
			E('th', { 'class': 'th' }, _('Status')),
			E('th', { 'class': 'th' }, _('Actions'))
		])
	]);

	rows.forEach(function(n) {
		var xorDisplay = n.xor && n.xor.length > 0 ? _('Yes') : _('No');

		var actionCell = E('td', { 'class': 'td' }, [
			E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'title': _('Force Refresh'),
				'click': ui.createHandlerFn(ctx, function() {
					return handleResult(
						callRefresh(n.uid, n.server_host, n.server_port, n.ip_version, true, false),
						'Refresh success'
					);
				})
			}, _('Refresh')),
			' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-edit',
				'title': _('Edit Node'),
				'click': ui.createHandlerFn(ctx, function() { showEditModal(ctx, n); })
			}, _('Edit')),
			' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-negative',
				'title': _('Deregister Node'),
				'click': ui.createHandlerFn(ctx, function() {
					if (!confirm(_('Are you sure to deregister this node?'))) return;
					return handleResult(
						callDeregister(n.uid, n.server_host, n.server_port, n.ip_version),
						'Deregister success'
					);
				})
			}, _('Deregister'))
		]);

		table.appendChild(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td' }, n.uid || ''),
			E('td', { 'class': 'td' }, n.server_host || ''),
			E('td', { 'class': 'td' }, String(n.server_port || '')),
			E('td', { 'class': 'td' }, String(n.client_port || '')),
			renderPSKCell(n.psk),
			E('td', { 'class': 'td' }, xorDisplay),
			E('td', { 'class': 'td' }, String(n.memlimit || '')),
			E('td', { 'class': 'td' }, n.description || ''),
			E('td', { 'class': 'td' }, n.ip_version || ''),
			E('td', { 'class': 'td' }, n.current_ip || ''),
			E('td', { 'class': 'td' }, fmtTime(n.last_updated)),
			E('td', { 'class': 'td' }, n.node_status || n.status || ''),
			actionCell
		]));
	});

	return table;
}

// === 视图主体 ===

return view.extend({
	load: function() {
		return callDump().then(function(res) {
			console.log('tumgrd dump raw:', res);
			return res;
		}).catch(function(err) {
			console.error('tumgrd dump failed:', err);
			ui.addNotification(null, E('p', String(err)), 'error');
			return {};
		});
	},

	handleRefreshAll: function(force) {
		return handleResult(
			callRefresh('', '', 0, '', !!force, true),
			force ? 'Force refresh all success' : 'Refresh all success'
		);
	},

	render: function(data) {
		console.log('tumgrd render data:', data);
		var rows = parseRows(data);
		console.log('tumgrd parsed rows:', rows);

		return E('div', {}, [
			E('div', {
				'style': 'display:flex; justify-content:space-between; align-items:center; gap:1em; flex-wrap:wrap;'
			}, [
				E('h2', { 'style': 'margin:0;' }, _('Tumgrd Nodes')),
				E('div', {}, [
					E('button', {
						'class': 'btn cbi-button cbi-button-add',
						'click': ui.createHandlerFn(this, function() {
							showRegisterModal(this);
						})
					}, _('Register Node')),
					' ',
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
				E('h3', {}, _('Nodes')),
				rows.length ? renderTable(this, rows) : E('em', {}, _('No nodes found'))
			])
		]);
	}
});
