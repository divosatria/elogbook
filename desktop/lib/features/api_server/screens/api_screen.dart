import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:test_lora/shared/providers/lora_provider.dart';
import 'package:test_lora/shared/widgets/app_topbar.dart';
import '../widgets/sync_card.dart';
import '../widgets/local_control_card.dart';
import '../widgets/endpoint_card.dart';
import '../widgets/code_card.dart';

class ApiScreen extends StatefulWidget {
  const ApiScreen({super.key});

  @override
  State<ApiScreen> createState() => _ApiScreenState();
}

class _ApiScreenState extends State<ApiScreen> {
  String? _localIp;

  @override
  void initState() {
    super.initState();
    _getLocalIp();
  }

  Future<void> _getLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(type: InternetAddressType.IPv4);
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback) {
            setState(() => _localIp = addr.address);
            return;
          }
        }
      }
    } catch (_) {}
    setState(() => _localIp = '127.0.0.1');
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const AppTopbar(title: 'API Server'),
      Expanded(
        child: Consumer<LoraProvider>(
          builder: (ctx, prov, child) => SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SyncCard(prov: prov),
                const SizedBox(height: 16),
                LocalControlCard(prov: prov, localIp: _localIp ?? '...'),
                const SizedBox(height: 16),
                EndpointCard(prov: prov, localIp: _localIp ?? 'localhost'),
                const SizedBox(height: 16),
                CodeCard(prov: prov, localIp: _localIp ?? 'localhost'),
              ],
            ),
          ),
        ),
      ),
    ]);
  }
}
