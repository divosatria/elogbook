// lib/screens/document_upload/document_upload_stepper.dart

import 'package:flutter/material.dart';
import 'widgets/progress_indicator_widget.dart';
import 'pages/step_1_ktp.dart';
import 'pages/step_2_pas_foto.dart';
import 'pages/step_3_npwp.dart';
import 'pages/step_4_buku_pelaut.dart';
import 'pages/step_5_sertifikat_nahkoda.dart';
import 'pages/step_6_bst.dart';
import 'pages/step_7_surat_sehat.dart';
import 'pages/step_8_skck.dart';
import '../../services/api/document_service.dart';
import '../../services/realtime/realtime_update_service.dart';

class DocumentUploadStepper extends StatefulWidget {
  final int initialStep;
  final String? rejectedDocType;
  final bool fromVesselDocs;

  const DocumentUploadStepper({
    Key? key,
    this.initialStep = 1,
    this.rejectedDocType,
    this.fromVesselDocs = false,
  }) : super(key: key);

  @override
  State<DocumentUploadStepper> createState() => _DocumentUploadStepperState();
}

class _DocumentUploadStepperState extends State<DocumentUploadStepper> {
  late int _currentStep;
  final int _totalSteps = 8;
  PageController? _pageController;
  Set<String> _uploadedDocs = {};
  List<String> _rejectedDocs = [];
  Map<int, String> _documentStatuses = {}; // step -> status
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _currentStep = widget.initialStep;
    _loadUploadedDocuments();
  }

  Future<void> _loadUploadedDocuments() async {
    try {
      final result = await DocumentService.getDocuments();
      
      if (result['success'] == true && result['documents'] != null) {
        final docs = result['documents'] as List;
        
        final uploadedTypes = <String>{};
        final rejectedTypes = <String>[];
        final statuses = <int, String>{};
        
        // Dokumen sudah difilter di service, jadi tidak ada duplikasi
        for (var doc in docs) {
          final jenis = doc['jenisDokumen'];
          final status = doc['status'];
          
          if (jenis != null) {
            final step = _getStepForDocType(jenis.toString());
            if (step > 0) {
              statuses[step] = status ?? 'pending';
              
              // Hanya tambahkan ke uploadedTypes jika approved/pending
              // Rejected tidak dianggap uploaded
              if (status == 'approved' || status == 'pending') {
                uploadedTypes.add(jenis.toString());
              } else if (status == 'rejected') {
                rejectedTypes.add(jenis.toString());
              }
            }
          }
        }
        
        _uploadedDocs = uploadedTypes;
        _rejectedDocs = rejectedTypes;
        _documentStatuses = statuses;
        
        print('📊 Document Status:');
        print('  Uploaded: $_uploadedDocs');
        print('  Rejected: $_rejectedDocs');
        print('  Statuses: $_documentStatuses');
        
        // Tentukan step awal
        if (widget.rejectedDocType != null) {
          _currentStep = _getStepForDocType(widget.rejectedDocType!);
        } else if (_rejectedDocs.isNotEmpty) {
          // Jika ada rejected, mulai dari rejected pertama
          _currentStep = _getStepForDocType(_rejectedDocs.first);
        } else {
          // Cari step pertama yang belum diupload
          _currentStep = _findNextStep();
        }
        
        _pageController = PageController(initialPage: _currentStep - 1);
        _pageController?.addListener(() {
          int newStep = (_pageController?.page?.round() ?? 0) + 1;
          if (newStep != _currentStep) {
            setState(() {
              _currentStep = newStep;
            });
          }
        });
        
        setState(() {
          _isLoading = false;
        });
      } else {
        _initializeDefaultController();
      }
    } catch (e) {
      print('❌ Error loading documents: $e');
      _initializeDefaultController();
    }
  }
  
  void _initializeDefaultController() {
    _pageController = PageController();
    _pageController?.addListener(() {
      int newStep = (_pageController?.page?.round() ?? 0) + 1;
      if (newStep != _currentStep) {
        setState(() {
          _currentStep = newStep;
        });
      }
    });
    setState(() {
      _isLoading = false;
    });
  }

  int _getStepForDocType(String docType) {
    final docTypes = ['KTP', 'Pas Foto', 'NPWP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST', 'Surat Keterangan Sehat', 'SKCK'];
    final index = docTypes.indexWhere((type) => type.toLowerCase() == docType.toLowerCase());
    return index >= 0 ? index + 1 : 1;
  }

  int _findNextStep() {
    final docTypes = ['KTP', 'Pas Foto', 'NPWP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST', 'Surat Keterangan Sehat', 'SKCK'];
    for (int i = 0; i < docTypes.length; i++) {
      if (!_uploadedDocs.contains(docTypes[i])) {
        return i + 1;
      }
    }
    return 8;
  }

  @override
  void dispose() {
    _pageController?.dispose();
    super.dispose();
  }

  void _goToNextStep() async {
    // Refresh document statuses setelah upload
    await _refreshDocumentStatuses();
    
    // Langsung notify listener untuk update banner di home screen
    print('🔔 Manually triggering documents listener after upload');
    final listeners = RealtimeUpdateService.getListener('documents');
    if (listeners != null) {
      for (var listener in listeners) {
        listener();
      }
    }
    
    // Jika ada rejected docs, prioritaskan rejected docs
    if (_rejectedDocs.isNotEmpty) {
      final currentDocType = _getDocTypeForStep(_currentStep);
      final currentIndex = _rejectedDocs.indexOf(currentDocType);
      
      // Jika ada rejected berikutnya, pindah ke sana
      if (currentIndex >= 0 && currentIndex < _rejectedDocs.length - 1) {
        final nextRejectedDoc = _rejectedDocs[currentIndex + 1];
        final nextStep = _getStepForDocType(nextRejectedDoc);
        
        _pageController?.animateToPage(
          nextStep - 1,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
        return;
      }
      
      // Jika sudah selesai semua rejected, keluar
      if (currentIndex >= 0) {
        // Trigger update sebelum keluar
        print('🔔 All rejected docs uploaded, triggering listener before exit');
        final listeners = RealtimeUpdateService.getListener('documents');
        if (listeners != null) {
          for (var listener in listeners) {
            listener();
          }
        }
        Navigator.pop(context);
        return;
      }
    }
    
    // Jika tidak ada rejected atau bukan dari rejected, lanjut ke step berikutnya yang belum diupload
    if (_currentStep < _totalSteps) {
      final nextStep = _findNextUnuploadedStep(_currentStep + 1);
      
      if (nextStep <= _totalSteps) {
        _pageController?.animateToPage(
          nextStep - 1,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      } else {
        // Semua dokumen sudah diupload
        // Trigger update sebelum keluar
        print('🔔 All documents uploaded, triggering listener before exit');
        final listeners = RealtimeUpdateService.getListener('documents');
        if (listeners != null) {
          for (var listener in listeners) {
            listener();
          }
        }
        Navigator.pop(context);
      }
    } else {
      // Sudah di step terakhir
      // Trigger update sebelum keluar
      print('🔔 Last step completed, triggering listener before exit');
      final listeners = RealtimeUpdateService.getListener('documents');
      if (listeners != null) {
        for (var listener in listeners) {
          listener();
        }
      }
      Navigator.pop(context);
    }
  }
  
  Future<void> _refreshDocumentStatuses() async {
    try {
      final result = await DocumentService.getDocuments();
      
      if (result['success'] == true && result['documents'] != null) {
        final docs = result['documents'] as List;
        
        final uploadedTypes = <String>{};
        final rejectedTypes = <String>[];
        final statuses = <int, String>{};
        
        for (var doc in docs) {
          final jenis = doc['jenisDokumen'];
          final status = doc['status'];
          
          if (jenis != null) {
            final step = _getStepForDocType(jenis.toString());
            if (step > 0) {
              statuses[step] = status ?? 'pending';
              
              if (status == 'approved' || status == 'pending') {
                uploadedTypes.add(jenis.toString());
              } else if (status == 'rejected') {
                rejectedTypes.add(jenis.toString());
              }
            }
          }
        }
        
        if (mounted) {
          setState(() {
            _uploadedDocs = uploadedTypes;
            _rejectedDocs = rejectedTypes;
            _documentStatuses = statuses;
          });
        }
        
        print('🔄 [Refresh] Updated statuses: $_documentStatuses');
      }
    } catch (e) {
      print('❌ Error refreshing statuses: $e');
    }
  }
  
  int _findNextUnuploadedStep(int startFrom) {
    final docTypes = ['KTP', 'Pas Foto', 'NPWP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST', 'Surat Keterangan Sehat', 'SKCK'];
    for (int i = startFrom - 1; i < docTypes.length; i++) {
      if (!_uploadedDocs.contains(docTypes[i])) {
        return i + 1;
      }
    }
    return _totalSteps + 1; // Semua sudah diupload
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.grey[50],
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: const Text(
          'Upload Dokumen',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            // Trigger update sebelum kembali
            print('🔔 Triggering documents listener before going back');
            final listeners = RealtimeUpdateService.getListener('documents');
            if (listeners != null) {
              for (var listener in listeners) {
                listener();
              }
            }
            
            if (widget.fromVesselDocs) {
              // Khusus dari Sertifikat Kapal, kembali ke Dokumen Kapal
              Navigator.of(context).popUntil((route) => route.isFirst);
              Navigator.pushNamed(context, '/vessel-documents');
            } else {
              // Default: kembali ke Home
              Navigator.of(context).popUntil((route) => route.isFirst);
            }
          },
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              if (_isDocumentUploaded(_getDocTypeForStep(_currentStep)))
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: Colors.green[100],
                  child: Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green[700], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Dokumen ini sudah diupload dan disetujui',
                          style: TextStyle(
                            color: Colors.green[900],
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: SingleChildScrollView(
                  child: SizedBox(
                    height: MediaQuery.of(context).size.height - 200,
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        Step1KTP(onNext: _goToNextStep),
                        Step2PasFoto(onNext: _goToNextStep),
                        Step3NPWP(onNext: _goToNextStep),
                        Step4BukuPelaut(onNext: _goToNextStep),
                        Step5SertifikatNahkoda(onNext: _goToNextStep),
                        Step6BST(onNext: _goToNextStep),
                        Step7SuratSehat(onNext: _goToNextStep),
                        Step8SKCK(onNext: _goToNextStep),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ProgressIndicatorWidget(
              currentStep: _currentStep,
              totalSteps: _totalSteps,
              documentStatuses: _documentStatuses,
            ),
          ),
        ],
      ),
    );
  }

  bool _isDocumentUploaded(String docType) {
    return _uploadedDocs.contains(docType);
  }

  String _getDocTypeForStep(int step) {
    final docTypes = ['KTP', 'Pas Foto', 'NPWP', 'Buku Pelaut', 'Sertifikat Nahkoda', 'BST', 'Surat Keterangan Sehat', 'SKCK'];
    return step > 0 && step <= docTypes.length ? docTypes[step - 1] : '';
  }
}