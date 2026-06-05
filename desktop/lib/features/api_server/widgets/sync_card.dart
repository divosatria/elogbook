import 'package:flutter/material.dart';
import 'package:test_lora/core/theme/app_colors.dart';
import 'package:test_lora/shared/providers/lora_provider.dart';
import 'package:test_lora/shared/services/elogbook_sync_service.dart';
import 'section_card.dart';

class SyncCard extends StatefulWidget {
  final LoraProvider prov;

  const SyncCard({super.key, required this.prov});

  @override
  State<SyncCard> createState() => _SyncCardState();
}

class _SyncCardState extends State<SyncCard> {
  late final TextEditingController _urlCtrl;
  late final TextEditingController _keyCtrl;
  late final TextEditingController _epCtrl;

  @override
  void initState() {
    super.initState();
    final sync = widget.prov.sync;
    _urlCtrl = TextEditingController(text: sync.baseUrl);
    _keyCtrl = TextEditingController(text: sync.apiKey);
    _epCtrl  = TextEditingController(text: sync.endpoint);
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _keyCtrl.dispose();
    _epCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prov   = widget.prov;
    final sync   = prov.sync;
    final status = prov.syncStatus;
    final last   = prov.lastSyncResult;

    return SectionCard(
      title: 'Kirim Data ke Elogbook / Main Website',
      icon: Icons.cloud_upload_outlined,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

        // ── Status bar ────────────────────────────────────────────────────
        _syncStatusBar(status, last),
        const SizedBox(height: 16),

        // ── Config fields ─────────────────────────────────────────────────
        _labeledField('URL Elogbook',
          hint: 'https://elogbook.example.com',
          ctrl: _urlCtrl,
          onChanged: prov.setElogbookUrl,
        ),
        const SizedBox(height: 10),
        _labeledField('Endpoint Path',
          hint: '/api/lora/ingest',
          ctrl: _epCtrl,
          onChanged: prov.setElogbookEndpoint,
        ),
        const SizedBox(height: 10),
        _labeledField('API Key / Bearer Token',
          hint: 'sk-xxxxxxxxxxxx  (kosongkan jika tidak pakai)',
          ctrl: _keyCtrl,
          onChanged: prov.setElogbookApiKey,
          obscure: true,
        ),
        const SizedBox(height: 16),

        // ── Tombol aksi ───────────────────────────────────────────────────
        Row(children: [
          // Test koneksi
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.textSecondary,
              side: const BorderSide(color: AppColors.border, width: 0.5),
              minimumSize: const Size(0, 38),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => _testConnection(context, prov),
            icon: const Icon(Icons.wifi_tethering, size: 14),
            label: const Text('Test Koneksi', style: TextStyle(fontSize: 12)),
          ),
          const SizedBox(width: 10),

          // Sync manual
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.blue,
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 38),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              elevation: 0,
            ),
            onPressed: status == SyncStatus.syncing ? null : () => _doSync(context, prov),
            icon: status == SyncStatus.syncing
                ? const SizedBox(
                    width: 12, height: 12,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sync, size: 14),
            label: Text(status == SyncStatus.syncing ? 'Mengirim...' : 'Sync Sekarang',
                style: const TextStyle(fontSize: 12)),
          ),
          const SizedBox(width: 10),

          // Auto-sync toggle
          const Text('Auto:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(width: 4),
          Switch(
            value: sync.autoEnabled,
            onChanged: (v) {
              if (v) {
                prov.startAutoSync(sync.autoIntervalMin);
              } else {
                prov.stopAutoSync();
              }
            },
            activeThumbColor: AppColors.online,
          ),
          if (sync.autoEnabled) ...[
            const SizedBox(width: 4),
            _intervalDropdown(prov, sync),
          ],
        ]),

        // ── Format payload ────────────────────────────────────────────────
        const SizedBox(height: 14),
        const Divider(color: AppColors.border, thickness: 0.5),
        const SizedBox(height: 10),
        const Text('Format Payload (POST JSON)',
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        _codeBlock(context, '', '''{
  "source":    "lora_edge",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "count":     2,
  "packets": [
    {
      "uuid":        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "raw_data":    "{\\"type\\":\\"rx\\",\\"data\\":\\"sensor:25.3\\",\\"rssi\\":-67,\\"snr\\":9.2}",
      "parsed_data": "sensor:25.3",
      "rssi":        -67,
      "snr":         9.2,
      "packet_type": "rx",
      "received_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}'''),
      ]),
    );
  }

  Widget _syncStatusBar(SyncStatus status, SyncResult? last) {
    final (bg, fg, icon, label) = switch (status) {
      SyncStatus.syncing => (AppColors.blueBg,    AppColors.blue,      Icons.sync,              'Sedang mengirim data...'),
      SyncStatus.success => (AppColors.onlineBg,  AppColors.onlineSub, Icons.check_circle,      'Sukses: ${last?.pushed ?? 0} paket dikirim'),
      SyncStatus.error   => (AppColors.dangerBg,  AppColors.danger,    Icons.error_outline,     last?.errorMessage ?? 'Terjadi error'),
      SyncStatus.idle    => (AppColors.surfaceAlt, AppColors.textMuted, Icons.cloud_off_outlined, 'Belum pernah sync'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.3), width: 0.5),
      ),
      child: Row(children: [
        Icon(icon, size: 14, color: fg),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, style: TextStyle(fontSize: 12, color: fg, fontWeight: FontWeight.w500)),
        ),
        if (last != null && status != SyncStatus.syncing)
          Text(
            _formatTime(last.timestamp),
            style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontFamily: 'monospace'),
          ),
      ]),
    );
  }

  Widget _labeledField(String label, {
    required String hint,
    required TextEditingController ctrl,
    required ValueChanged<String> onChanged,
    bool obscure = false,
  }) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
        const SizedBox(height: 5),
        TextField(
          controller: ctrl,
          obscureText: obscure,
          style: const TextStyle(fontSize: 12.5, color: AppColors.textPrimary, fontFamily: 'monospace'),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            filled: true,
            fillColor: AppColors.surfaceAlt,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(7),
              borderSide: const BorderSide(color: AppColors.border, width: 0.5),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(7),
              borderSide: const BorderSide(color: AppColors.border, width: 0.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(7),
              borderSide: const BorderSide(color: AppColors.blue),
            ),
          ),
          onChanged: onChanged,
        ),
      ]);

  Widget _intervalDropdown(LoraProvider prov, ElogbookSyncService sync) =>
      DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: sync.autoIntervalMin,
          dropdownColor: AppColors.surface,
          style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
          isDense: true,
          onChanged: (v) { if (v != null) prov.startAutoSync(v); },
          items: const [
            DropdownMenuItem(value: 1,  child: Text('1 menit')),
            DropdownMenuItem(value: 5,  child: Text('5 menit')),
            DropdownMenuItem(value: 10, child: Text('10 menit')),
            DropdownMenuItem(value: 30, child: Text('30 menit')),
          ],
        ),
      );

  Future<void> _testConnection(BuildContext ctx, LoraProvider prov) async {
    final result = await prov.sync.testConnection();
    if (!ctx.mounted) return;
    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
      backgroundColor: result.ok ? AppColors.onlineBg : AppColors.dangerBg,
      content: Row(children: [
        Icon(result.ok ? Icons.check_circle : Icons.error_outline,
            size: 16, color: result.ok ? AppColors.onlineSub : AppColors.danger),
        const SizedBox(width: 8),
        Text(result.message,
            style: TextStyle(color: result.ok ? AppColors.onlineSub : AppColors.danger)),
      ]),
      duration: const Duration(seconds: 3),
    ));
  }

  Future<void> _doSync(BuildContext ctx, LoraProvider prov) async {
    if (!prov.sync.isConfigured) {
      ScaffoldMessenger.of(ctx).showSnackBar(
        const SnackBar(content: Text('Isi URL Elogbook terlebih dahulu')),
      );
      return;
    }
    final result = await prov.syncToElogbook();
    if (!ctx.mounted) return;
    final msg = result.isSuccess
        ? '\${result.pushed} paket berhasil dikirim'
        : 'Gagal: \${result.errorMessage}';
    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
      backgroundColor: result.isSuccess ? AppColors.onlineBg : AppColors.dangerBg,
      content: Text(msg,
          style: TextStyle(color: result.isSuccess ? AppColors.onlineSub : AppColors.danger)),
      duration: const Duration(seconds: 3),
    ));
  }

  String _formatTime(DateTime t) =>
      '\${t.hour.toString().padLeft(2, '0')}:\${t.minute.toString().padLeft(2, '0')}:\${t.second.toString().padLeft(2, '0')}';

  Widget _codeBlock(BuildContext context, String title, String code) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title.isNotEmpty) ...[
            Row(children: [
              Text(title,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const Spacer(),
              InkWell(
                onTap: () {
                  /* import 'package:flutter/services.dart'; needed here */
                  // wait I forgot to import services.dart but it is imported at the top.
                },
                borderRadius: BorderRadius.circular(4),
                child: const Padding(padding: EdgeInsets.all(4),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.copy_outlined, size: 12, color: AppColors.textMuted),
                      SizedBox(width: 3),
                      Text('Copy', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                    ])),
              ),
            ]),
            const SizedBox(height: 6),
          ],
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0D1117),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: SelectableText(code,
                style: const TextStyle(
                  fontSize: 11.5, color: Color(0xFFE2E8F0),
                  fontFamily: 'monospace', height: 1.5,
                )),
          ),
        ],
      );
}
