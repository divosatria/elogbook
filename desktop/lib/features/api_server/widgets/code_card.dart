import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:test_lora/core/theme/app_colors.dart';
import 'package:test_lora/shared/providers/lora_provider.dart';
import 'section_card.dart';

class CodeCard extends StatelessWidget {
  final LoraProvider prov;
  final String localIp;

  const CodeCard({super.key, required this.prov, required this.localIp});

  @override
  Widget build(BuildContext context) {
    final host = localIp;
    final port = prov.apiPortActive;

    final jsCode = "// JavaScript — polling data dari edge ke website\n"
        "const BASE = 'http://$host:$port/api';\n\n"
        "setInterval(async () => {\n"
        "  const { data } = await fetch(`\${BASE}/packets/latest?limit=20`)\n"
        "    .then(r => r.json());\n"
        "  updateDashboard(data);\n"
        "}, 2000);";

    final pyCode = "# Python — ambil data & kirim ke elogbook\n"
        "import requests\n\n"
        "EDGE  = 'http://$host:$port/api'\n"
        "ELOG  = 'https://elogbook.example.com/api/lora/ingest'\n"
        "TOKEN = 'Bearer sk-xxxx'\n\n"
        "def push_to_elogbook():\n"
        "    packets = requests.get(f'{EDGE}/packets?unsynced=1&limit=100').json()['data']\n"
        "    if not packets: return\n"
        "    requests.post(ELOG, json={'packets': packets},\n"
        "                  headers={'Authorization': TOKEN})";

    return SectionCard(
      title: 'Contoh Kode Integrasi',
      icon: Icons.code_outlined,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _codeBlock(context, 'JavaScript / Fetch API', jsCode),
        const SizedBox(height: 12),
        _codeBlock(context, 'Python / requests', pyCode),
      ]),
    );
  }

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
                  Clipboard.setData(ClipboardData(text: code));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Kode disalin'), duration: Duration(seconds: 1)),
                  );
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
