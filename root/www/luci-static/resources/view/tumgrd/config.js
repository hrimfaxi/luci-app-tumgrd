'use strict';
'require form';
'require uci';
'require view';
'require tools.widgets as widgets';

return view.extend({
	load: function() {
		return uci.load('tumgrd');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('tumgrd', _('Tumgrd'), _('Configure tumgrd daemon options.'));

		s = m.section(form.NamedSection, 'main', 'tumgrd', _('Main Settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.option(form.Value, 'socket', _('Socket path'));
		o.datatype = 'string';
		o.placeholder = '/var/run/tumgrd.sock';
		o.rmempty = false;

		o = s.option(form.Value, 'database', _('Database path'));
		o.datatype = 'string';
		o.placeholder = '/lib/tumgrd/tumgrd.db';
		o.rmempty = false;

		o = s.option(form.Value, 'interval', _('Monitor interval (seconds)'));
		o.datatype = 'range(30,3600)';
		o.placeholder = '300';
		o.rmempty = false;

		o = s.option(form.Value, 'client_bin', _('tuctl_client path'));
		o.datatype = 'string';
		o.placeholder = '/usr/bin/tuctl_client';

		o = s.option(form.ListValue, 'log_format', _('Log format'));
		o.value('text', _('text'));
		o.value('json', _('json'));
		o.default = 'text';

		o = s.option(form.ListValue, 'log_level', _('Log level'));
		o.value('debug', _('debug'));
		o.value('info', _('info'));
		o.value('warn', _('warn'));
		o.value('error', _('error'));
		o.default = 'info';

		return m.render();
	}
});
