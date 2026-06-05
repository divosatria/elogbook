import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:test_lora/core/theme/app_colors.dart';
import 'package:test_lora/shared/providers/lora_provider.dart';
import 'section_card.dart';

class LocalControlCard extends StatelessWidget {
  final LoraProvider prov;
  final String localIp;

  const LocalControlCard({super.key, required this.prov, required this.localIp});

  @override
  Widget build(BuildContext context) {
    final running = prov.apiRunning;
    final host = localIp;
    final port = prov.apiPortActive;

    return SectionCard(
      title: 'Local API Server (Inbound)',
      icon: Icons.dns_outlined,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 10, height: 10,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: running ? AppColors.online : AppColors.textMuted,
              boxShadow: running
                  ? [BoxShadow(color: AppColors.online.withValues(alpha: 0.5), blurRadius: 6)]
                  : null,
            ),
          ),
          const SizedBox(width: 8),
          Text(running ? 'Server Berjalan' : 'Server Mati',
              style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w700,
                color: running ? AppColors.online : AppColors.textMuted,
              )),
          const Spacer(),
          if (running)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.onlineBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.online, width: 0.5),
              ),
              child: Text('http://$host:$port',
                  style: const TextStyle(
                    fontSize: 12, color: AppColors.onlineSub,
                    fontFamily: 'monospace', fontWeight: FontWeight.w600,
                  )),
            ),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          const Text('Port:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
            child: TextField(
              enabled: !running,
              controller: TextEditingController(text: '${prov.apiPort}'),
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontFamily: 'monospace'),
              decoration: _inputDecor(),
              onChanged: (v) {
                final p = int.tryParse(v);
                if (p != null && p > 1024 && p < 65535) prov.setApiPort(p);
              },
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: running ? AppColors.dangerText : AppColors.blue,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              onPressed: running
                  ? () async { await prov.stopApiServer(); }
                  : () async {
                      final ok = await prov.startApiServer();
                      if (!ok && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Gagal memulai server. Port mungkin sedang digunakan.')),
                        );
                      }
                    },
              icon: Icon(running ? Icons.stop : Icons.play_arrow, size: 16),
              label: Text(running ? 'Stop Server' : 'Start Server'),
            ),
          ),
        ]),
        if (running) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.info_outline, size: 12, color: AppColors.textMuted),
                SizedBox(width: 6),
                Text('Akses dari perangkat lain di jaringan yang sama:',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ]),
              const SizedBox(height: 6),
              SelectableText('http://$host:$port/api/packets/latest',
                  style: const TextStyle(fontSize: 12, color: AppColors.blue, fontFamily: 'monospace')),
            ]),
          ),
        ],
      ]),
    );
  }

  InputDecoration _inputDecor() => InputDecoration(
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        filled: true, fillColor: AppColors.surfaceAlt,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.border, width: 0.5)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.border, width: 0.5)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.blue)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.border, width: 0.5)),
      );
}
