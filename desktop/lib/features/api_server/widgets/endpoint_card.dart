import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:test_lora/core/theme/app_colors.dart';
import 'package:test_lora/shared/providers/lora_provider.dart';
import 'section_card.dart';

class EndpointCard extends StatelessWidget {
  final LoraProvider prov;
  final String localIp;

  const EndpointCard({super.key, required this.prov, required this.localIp});

  @override
  Widget build(BuildContext context) {
    final base = 'http://$localIp:${prov.apiPortActive}';
    final endpoints = [
      ('GET',  '/api/health',         'Cek server hidup'),
      ('GET',  '/api/stats',          'Statistik total/rx/error/unsynced'),
      ('GET',  '/api/packets',        'Semua paket (limit, offset, type, from, to)'),
      ('GET',  '/api/packets/latest', 'Paket RX terbaru (default: 20)'),
      ('GET',  '/api/packets/:id',    'Detail satu paket berdasarkan ID'),
      ('GET',  '/api/packets/range',  'Filter rentang waktu (from & to ISO8601)'),
      ('GET',  '/api/export/csv',     'Download file CSV'),
    ];

    return SectionCard(
      title: 'Endpoint Local Server',
      icon: Icons.route_outlined,
      child: Column(
        children: endpoints.map((e) {
          final (method, path, desc) = e;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              Container(
                width: 36,
                padding: const EdgeInsets.symmetric(vertical: 2),
                decoration: BoxDecoration(color: AppColors.blueBg, borderRadius: BorderRadius.circular(4)),
                child: Center(child: Text(method,
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.blue))),
              ),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(path, style: const TextStyle(fontSize: 11.5, color: AppColors.textPrimary, fontFamily: 'monospace')),
                Text(desc, style: const TextStyle(fontSize: 10.5, color: AppColors.textSecondary)),
              ])),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: '$base$path'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('URL disalin'), duration: Duration(seconds: 1)),
                  );
                },
                borderRadius: BorderRadius.circular(4),
                child: const Padding(padding: EdgeInsets.all(4),
                    child: Icon(Icons.copy_outlined, size: 13, color: AppColors.textMuted)),
              ),
            ]),
          );
        }).toList(),
      ),
    );
  }
}
