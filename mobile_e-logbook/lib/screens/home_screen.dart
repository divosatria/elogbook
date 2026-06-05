import 'package:e_logbook/widgets/catch_corousel.dart';
import 'package:e_logbook/widgets/custom_silver_appbar.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:e_logbook/screens/documents/document_popup_helper.dart';
import 'package:e_logbook/screens/documents/pending_popup_helper.dart';
import 'package:e_logbook/services/api/document_service.dart';
import 'package:e_logbook/services/realtime/realtime_update_service.dart';
import 'package:e_logbook/services/monitoring/schedule_monitoring_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../provider/catch_provider.dart';
import '../provider/user_provider.dart';
import '../provider/navigation_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with WidgetsBindingObserver, AutomaticKeepAliveClientMixin {
  bool _showDocumentAlert = false;
  bool _showPendingBanner = false;
  bool _showRejectedAlert = false;
  int _rejectedCount = 0;
  bool _hasShownPopup = false;
  bool _hasLoggedInit = false;
  bool _isMonthlyView = true; // true = bulanan, false = tahunan
  bool _hasFetchedCatches = false;

  // Cache provider reference
  UserProvider? _userProvider;

  @override
  bool get wantKeepAlive => true;

  @override
  void didChangeDependencies() {
    print('🔄 [HOME] didChangeDependencies START, mounted=$mounted');
    super.didChangeDependencies();
    // Save provider reference safely
    _userProvider = Provider.of<UserProvider>(context, listen: false);
    print(
      '🔄 [HOME] didChangeDependencies END, _userProvider=${_userProvider != null}',
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    
    // Register listeners dengan key unik
    RealtimeUpdateService.addListener('documents-home', _handleDocumentUpdate);
    RealtimeUpdateService.addListener('document-verified', _handleDocumentUpdate);
    
    // Schedule data loading
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAllData();
      ScheduleMonitoringService.checkForNewSchedules();
    });
  }
  
  void _handleDocumentUpdate() {
    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _checkDocumentCompletion();
      });
    }
  }

  Future<void> _loadAllData() async {
    if (!mounted || _userProvider == null) return;
    
    await _userProvider!.loadUserFromStorage();
    if (!mounted) return;

    // Fetch catch history
    final catchProvider = Provider.of<CatchProvider>(context, listen: false);
    await catchProvider.fetchCatches();
    if (!mounted) return;

    if (!_hasShownPopup) {
      await _checkAndShowPopup();
      if (mounted) _hasShownPopup = true;
    }

    if (!mounted) return;
    await _checkDocumentCompletion();
    
    if (!_hasLoggedInit && mounted) {
      _hasLoggedInit = true;
    }
  }

  Future<void> _checkAndShowPopup() async {
    if (!mounted || _userProvider == null) return;

    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;

    // Check if popup already shown in this session
    final popupShownThisSession =
        prefs.getBool('popup_shown_this_session') ?? false;
    if (popupShownThisSession) {
      print('⏭️ HomeScreen: Popup already shown this session, skip');
      return;
    }

    // Ambil data dokumen dari API untuk mendapatkan count yang akurat
    try {
      final response = await DocumentService.getDocuments();
      if (!mounted) return;

      if (response['success'] == true) {
        final docs = response['documents'] as List;
        final pending = docs.where((d) => d['status'] == 'pending').length;
        final approved = docs.where((d) => d['status'] == 'approved').length;
        final rejected = docs.where((d) => d['status'] == 'rejected').length;

        if (!mounted) return;

        final userRole = _userProvider!.user?.role ?? 'Crew';

        print('👤 HomeScreen: User role = $userRole');
        print(
          '📋 HomeScreen: approved=$approved, pending=$pending, rejected=$rejected',
        );

        // Jika semua dokumen sudah completed (8 dokumen approved), jangan tampilkan popup apapun
        if (approved >= 8) {
          print('✅ HomeScreen: All 8 documents approved, no popup needed');
          return;
        }

        // Jika ada rejected, tampilkan popup rejected (prioritas tertinggi)
        if (rejected > 0 && mounted) {
          print(
            '🔴 HomeScreen: Showing rejected popup with rejectedCount=$rejected',
          );
          await prefs.setBool('popup_shown_this_session', true);
          if (!mounted) return;

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              PendingPopupHelper.showPendingPopup(
                context: context,
                userRole: userRole,
                pendingCount: pending,
                approvedCount: approved,
                rejectedCount: rejected,
                totalCount: 8,
              );
            }
          });
          return;
        }

        // Jika ada pending dan sudah upload 8 dokumen, tampilkan pending popup
        final totalUploaded = approved + pending + rejected;
        if (pending > 0 && totalUploaded >= 8 && mounted) {
          print(
            '🟠 HomeScreen: Showing pending popup with pendingCount=$pending',
          );
          await prefs.setBool('popup_shown_this_session', true);
          if (!mounted) return;

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              PendingPopupHelper.showPendingPopup(
                context: context,
                userRole: userRole,
                pendingCount: pending,
                approvedCount: approved,
                rejectedCount: rejected,
                totalCount: 8,
              );
            }
          });
          return;
        }

        // Jika belum lengkap 8 dokumen, tampilkan upload popup
        if (totalUploaded < 8 && mounted) {
          print('🎯 HomeScreen: Showing document upload popup');
          await prefs.setBool('popup_shown_this_session', true);
          if (!mounted) return;

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              DocumentPopupHelper.showDocumentPopup(context, userRole);
            }
          });
        }
      }
    } catch (e) {
      print('⚠️ Error checking documents for popup: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    RealtimeUpdateService.removeListener('documents-home');
    RealtimeUpdateService.removeListener('document-verified');
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Auto-reload ketika app resumed (kembali dari background)
    if (state == AppLifecycleState.resumed) {
      print('🔄 App resumed, refreshing document status...');
      // Cukup refresh data, listener sudah terdaftar di initState
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _checkDocumentCompletion();
      });
    }
  }

  Future<void> _checkDocumentCompletion() async {
    print('🔍 [HOME] _checkDocumentCompletion START, mounted=$mounted');
    if (!mounted) {
      print('❌ [HOME] _checkDocumentCompletion ABORT: not mounted');
      return;
    }

    // Refresh catch data
    final catchProvider = Provider.of<CatchProvider>(context, listen: false);
    await catchProvider.fetchCatches();
    if (!mounted) return;

    print('🔍 [HOME] Getting SharedPreferences...');
    final prefs = await SharedPreferences.getInstance();
    print('✅ [HOME] SharedPreferences obtained, mounted=$mounted');

    if (!mounted) {
      print('❌ [HOME] _checkDocumentCompletion ABORT after prefs: not mounted');
      return;
    }

    // Get real document counts from API with error handling
    try {
      print('🔍 [HOME] Fetching documents from API...');
      final response = await DocumentService.getDocuments().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('⏱️ Document fetch timeout - using cached data');
          return {'success': false};
        },
      );

      print('✅ [HOME] API response received, mounted=$mounted');
      if (!mounted) {
        print('❌ [HOME] _checkDocumentCompletion ABORT after API: not mounted');
        return;
      }

      if (response['success'] == true) {
        final docs = response['documents'] as List;
        final pending = docs.where((d) => d['status'] == 'pending').length;
        final approved = docs.where((d) => d['status'] == 'approved').length;
        final rejected = docs.where((d) => d['status'] == 'rejected').length;
        final total = docs.length;

        print(
          '📊 [Document Status] Total: $total, Approved: $approved, Pending: $pending, Rejected: $rejected',
        );

        // Jika tidak ada dokumen sama sekali, reset semua status
        if (total == 0) {
          print('🧹 [HOME] No documents, resetting status...');
          await prefs.setBool('documents_completed', false);
          await prefs.setBool('documents_pending', false);
          await prefs.setBool('has_rejected_documents', false);
          print('🧹 [Reset] No documents found, cleared all status');

          if (mounted) {
            setState(() {
              _rejectedCount = 0;
              _showDocumentAlert = true;
              _showPendingBanner = false;
              _showRejectedAlert = false;
            });
            print('✅ [HOME] State updated for empty docs');
          }
          print('🔍 [HOME] _checkDocumentCompletion END (empty docs)');
          return;
        }

        // Validasi:
        // - Dokumen completed jika semua 8 dokumen sudah approved
        // - Pending popup HANYA muncul jika SEMUA 8 dokumen sudah diupload DAN ada yang pending
        // - Upload popup muncul jika belum lengkap 8 dokumen
        // - Rejected HANYA jika ada dokumen dengan status rejected (bukan dihapus)
        final allDocsApproved = approved >= 8;
        final totalUploaded =
            approved + pending + rejected; // Total dokumen yang ada
        const totalRequired = 8;

        // Pending hanya jika sudah upload semua 8 dokumen dan ada yang masih pending
        final hasPending = totalUploaded >= totalRequired && pending > 0;
        final hasRejected =
            rejected > 0; // Hanya jika ada rejected, bukan dihapus

        // Update status
        await prefs.setBool('documents_completed', allDocsApproved);
        await prefs.setBool('documents_pending', hasPending);
        await prefs.setBool('has_rejected_documents', hasRejected);
        await prefs.setInt('approved_count', approved);
        await prefs.setInt('total_uploaded', totalUploaded);

        print(
          '✅ [Validation] Approved: $approved, Pending: $pending, Rejected: $rejected, Total: $totalUploaded/8, Show pending: $hasPending, Show rejected: $hasRejected',
        );
        print(
          '🎨 [UI UPDATE] Setting state - showRejected: $hasRejected, showPending: $hasPending, showAlert: ${!allDocsApproved && !hasPending && !hasRejected}',
        );

        if (!mounted) {
          print('❌ [HOME] Not mounted before setState');
          return;
        }

        // Update state with setState after frame to avoid conflicts
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          setState(() {
            _rejectedCount = rejected;
            if (hasRejected) {
              _showDocumentAlert = false;
              _showPendingBanner = false;
              _showRejectedAlert = true;
              print('🔴 [UI] REJECTED banner showing');
            } else if (hasPending) {
              _showDocumentAlert = false;
              _showPendingBanner = true;
              _showRejectedAlert = false;
              print('🟠 [UI] PENDING banner showing');
            } else if (!allDocsApproved) {
              _showDocumentAlert = true;
              _showPendingBanner = false;
              _showRejectedAlert = false;
              print('🟡 [UI] UPLOAD alert showing');
            } else {
              _showDocumentAlert = false;
              _showPendingBanner = false;
              _showRejectedAlert = false;
              print('✅ [UI] All banners hidden');
            }
          });
        });

        print('🔍 [HOME] _checkDocumentCompletion END (success)');
        return;
      }
    } catch (e) {
      print('⚠️ [HOME] Error fetching documents (offline mode): $e');
    }

    print('🔍 [HOME] Using fallback cached data, mounted=$mounted');
    if (!mounted) {
      print(
        '❌ [HOME] _checkDocumentCompletion ABORT before fallback: not mounted',
      );
      return;
    }

    // Fallback if API fails - use cached data
    final documentsCompleted = prefs.getBool('documents_completed') ?? false;
    final documentsPending = prefs.getBool('documents_pending') ?? false;
    final hasRejected = prefs.getBool('has_rejected_documents') ?? false;

    print(
      '💾 [Cached] completed=$documentsCompleted, pending=$documentsPending, rejected=$hasRejected',
    );

    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() {
          _showDocumentAlert =
              !documentsCompleted && !documentsPending && !hasRejected;
          _showPendingBanner = documentsPending;
          _showRejectedAlert = hasRejected && !documentsPending;
        });
        print('✅ [HOME] State updated for fallback');
      });
    }
    print('🔍 [HOME] _checkDocumentCompletion END (fallback)');
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final isTablet = ResponsiveHelper.isTablet(context);
    
    // Fetch catches once if empty — avoid re-fetching on every rebuild
    if (!_hasFetchedCatches) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          final catchProvider = Provider.of<CatchProvider>(context, listen: false);
          if (catchProvider.catches.isEmpty) {
            debugPrint('⚠️ [HOME BUILD] Catches empty, fetching (once)...');
            _hasFetchedCatches = true;
            catchProvider.fetchCatches();
          } else {
            debugPrint('✅ [HOME BUILD] Catches available: ${catchProvider.catches.length}');
            _hasFetchedCatches = true;
          }
        }
      });
    }

    // Jika tablet, render tanpa CustomSliverAppBar karena sudah ada header di MainScreen
    if (isTablet) {
      return RefreshIndicator(
        onRefresh: _checkDocumentCompletion,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.only(
              left: 16,
              right: 16,
              top: 8,
              bottom: 16,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Carousel - Proportional for tablet
                CatchCarousel(),
                const SizedBox(height: 12),

                // Document Alert
                if (_showDocumentAlert)
                  ValueListenableBuilder<bool>(
                    valueListenable: DocumentPopupHelper.isPopupVisible,
                    builder: (context, isPopupVisible, child) {
                      if (!isPopupVisible) {
                        return Column(
                          children: [
                            _buildDocumentAlert(),
                            const SizedBox(height: 12),
                          ],
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),

                // Pending Banner
                if (_showPendingBanner) _buildPendingBanner(),
                if (_showPendingBanner) const SizedBox(height: 12),

                // Rejected Alert
                if (_showRejectedAlert) _buildRejectedAlert(),
                if (_showRejectedAlert) const SizedBox(height: 12),

                // Statistics Container - Compact for tablet
                Container(
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    top: 12,
                    bottom: 16,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Statistik Semua Data',
                        style: TextStyle(
                          fontSize: MediaQuery.of(context).size.width < 800
                              ? 14
                              : 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                      SizedBox(
                        height: MediaQuery.of(context).size.width < 800
                            ? 10
                            : 12,
                      ),
                      _buildTabletStatisticsCards(),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Weekly Activity Chart - Compact
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: _buildCompactWeeklyActivity(),
                ),

                const SizedBox(height: 16),

                // Recent Catches Container - Compact
                Container(
                  padding: const EdgeInsets.only(
                    left: 16,
                    right: 16,
                    top: 5,
                    bottom: 16,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: _buildRecentCatches(),
                ),

                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      );
    }

    // Mobile layout dengan CustomScrollView
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _checkDocumentCompletion,
        child: CustomScrollView(
          slivers: [
            CustomSliverAppBar(),
            SliverToBoxAdapter(
              child: Transform.translate(
                offset: const Offset(0, -10),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  padding: ResponsiveHelper.padding(
                    context,
                    mobile: 20,
                    tablet: 32,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Carousel
                      CatchCarousel(),
                      SizedBox(
                        height: ResponsiveHelper.height(
                          context,
                          mobile: 16,
                          tablet: 20,
                        ),
                      ),

                      // Document Alert
                      if (_showDocumentAlert)
                        ValueListenableBuilder<bool>(
                          valueListenable: DocumentPopupHelper.isPopupVisible,
                          builder: (context, isPopupVisible, child) {
                            if (!isPopupVisible) {
                              return Column(
                                children: [
                                  _buildDocumentAlert(),
                                  SizedBox(
                                    height: ResponsiveHelper.height(
                                      context,
                                      mobile: 16,
                                      tablet: 20,
                                    ),
                                  ),
                                ],
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),

                      // Pending Banner
                      if (_showPendingBanner) _buildPendingBanner(),
                      if (_showPendingBanner)
                        SizedBox(
                          height: ResponsiveHelper.height(
                            context,
                            mobile: 16,
                            tablet: 20,
                          ),
                        ),

                      // Rejected Alert (berbeda dengan document alert)
                      if (_showRejectedAlert) _buildRejectedAlert(),
                      if (_showRejectedAlert)
                        SizedBox(
                          height: ResponsiveHelper.height(
                            context,
                            mobile: 16,
                            tablet: 20,
                          ),
                        ),

                      // Statistics Container
                      Container(
                        padding: ResponsiveHelper.padding(
                          context,
                          mobile: 20,
                          tablet: 24,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Statistik Semua Data',
                              style: TextStyle(
                                fontSize: ResponsiveHelper.font(
                                  context,
                                  mobile: 20,
                                  tablet: 24,
                                ),
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            SizedBox(
                              height: ResponsiveHelper.height(
                                context,
                                mobile: 16,
                                tablet: 20,
                              ),
                            ),
                            _buildStatisticsCards(),
                          ],
                        ),
                      ),

                      SizedBox(
                        height: ResponsiveHelper.height(
                          context,
                          mobile: 28,
                          tablet: 36,
                        ),
                      ),

                      // Weekly Activity Chart
                      _buildWeeklyActivity(),

                      SizedBox(
                        height: ResponsiveHelper.height(
                          context,
                          mobile: 28,
                          tablet: 36,
                        ),
                      ),

                      // Recent Catches Container
                      Container(
                        padding: ResponsiveHelper.padding(
                          context,
                          mobile: 20,
                          tablet: 24,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: _buildRecentCatches(),
                      ),

                      SizedBox(
                        height: ResponsiveHelper.height(
                          context,
                          mobile: 20,
                          tablet: 28,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatisticsCards() {
    final provider = Provider.of<CatchProvider>(context);
    
    debugPrint('\n🔍 [_buildStatisticsCards] Called');
    debugPrint('🔍 [Provider] catches.length = ${provider.catches.length}');
    debugPrint('🔍 [Provider] isLoading = ${provider.isLoading}');
    
    // TAMPILKAN SEMUA DATA tanpa filter
    final filteredCatches = provider.catches;
    
    if (filteredCatches.isEmpty) {
      debugPrint('⚠️ [Stats] NO DATA - Catches is empty!');
    } else {
      debugPrint('✅ [Stats] Found ${filteredCatches.length} catches');
      for (var i = 0; i < filteredCatches.length && i < 3; i++) {
        debugPrint('   [$i] ${filteredCatches[i].fishName} - ${filteredCatches[i].weight}kg');
      }
    }
    
    final totalWeight = filteredCatches.fold<double>(0, (sum, catch_) => sum + catch_.weight);
    final totalRevenue = filteredCatches.fold<double>(0, (sum, catch_) => sum + catch_.totalRevenue);
    final averageWeight = filteredCatches.isEmpty ? 0.0 : totalWeight / filteredCatches.length;

    debugPrint('📊 [Stats Result]:');
    debugPrint('   Catches: ${filteredCatches.length}');
    debugPrint('   Total Weight: ${totalWeight.toStringAsFixed(1)} kg');
    debugPrint('   Total Revenue: Rp ${totalRevenue.toStringAsFixed(0)}');
    debugPrint('   Average: ${averageWeight.toStringAsFixed(1)} kg\n');

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildModernStatCard(
                icon: Icons.phishing_rounded,
                label: 'Tangkapan',
                value: '${filteredCatches.length}',
                subtitle: 'ikan',
                gradientColors: [Color(0xFF4A90E2), Color(0xFF357ABD)],
              ),
            ),
            SizedBox(
              width: ResponsiveHelper.width(context, mobile: 12, tablet: 16),
            ),
            Expanded(
              child: _buildModernStatCard(
                icon: Icons.scale_rounded,
                label: 'Total Berat',
                value: totalWeight.toStringAsFixed(1),
                subtitle: 'kg',
                gradientColors: [Color(0xFF5CB85C), Color(0xFF449D44)],
              ),
            ),
          ],
        ),
        SizedBox(
          height: ResponsiveHelper.height(context, mobile: 12, tablet: 16),
        ),
        Row(
          children: [
            Expanded(
              child: _buildModernStatCard(
                icon: Icons.payments_rounded,
                label: 'Pendapatan',
                value: 'Rp ${(totalRevenue / 1000).toStringAsFixed(0)}k',
                subtitle: '',
                gradientColors: [Color(0xFFF0AD4E), Color(0xFFEC971F)],
              ),
            ),
            SizedBox(
              width: ResponsiveHelper.width(context, mobile: 12, tablet: 16),
            ),
            Expanded(
              child: _buildModernStatCard(
                icon: Icons.trending_up_rounded,
                label: 'Rata-rata',
                value: averageWeight.toStringAsFixed(1),
                subtitle: 'kg/ikan',
                gradientColors: [Color(0xFF9B59B6), Color(0xFF8E44AD)],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildModernStatCard({
    required IconData icon,
    required String label,
    required String value,
    required String subtitle,
    required List<Color> gradientColors,
  }) {
    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 12, tablet: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(
          ResponsiveHelper.width(context, mobile: 20, tablet: 24),
        ),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withOpacity(0.3),
            blurRadius: ResponsiveHelper.width(context, mobile: 12, tablet: 16),
            offset: Offset(
              0,
              ResponsiveHelper.height(context, mobile: 6, tablet: 8),
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: ResponsiveHelper.width(context, mobile: 40, tablet: 60),
            height: ResponsiveHelper.height(context, mobile: 40, tablet: 60),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(
                ResponsiveHelper.width(context, mobile: 12, tablet: 15),
              ),
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: ResponsiveHelper.width(context, mobile: 24, tablet: 32),
            ),
          ),
          SizedBox(
            height: ResponsiveHelper.height(context, mobile: 8, tablet: 16),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
              color: Colors.white.withOpacity(0.9),
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(
            height: ResponsiveHelper.height(context, mobile: 4, tablet: 6),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: ResponsiveHelper.font(
                      context,
                      mobile: 24,
                      tablet: 28,
                    ),
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(
                width: ResponsiveHelper.width(context, mobile: 4, tablet: 6),
              ),
              Padding(
                padding: EdgeInsets.only(
                  bottom: ResponsiveHelper.height(
                    context,
                    mobile: 3,
                    tablet: 4,
                  ),
                ),
                child: Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: ResponsiveHelper.font(
                      context,
                      mobile: 11,
                      tablet: 13,
                    ),
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklyActivity() {
    final provider = Provider.of<CatchProvider>(context);

    // Generate data berdasarkan view yang dipilih
    List<Map<String, dynamic>> chartData = _isMonthlyView 
        ? _getMonthlyData(provider) 
        : _getYearlyData(provider);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Aktivitas Trip',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              Row(
                children: [
                  // Toggle Button
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        _buildToggleButton('Bulanan', _isMonthlyView),
                        _buildToggleButton('Tahunan', !_isMonthlyView),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Berat total tangkapan (kg)',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 20,
                  getDrawingHorizontalLine: (value) {
                    return FlLine(color: Colors.grey[200]!, strokeWidth: 1);
                  },
                ),
                titlesData: FlTitlesData(
                  show: true,
                  rightTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      interval: _isMonthlyView ? 5 : 1,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 && value.toInt() < chartData.length) {
                          if (_isMonthlyView && value.toInt() % 5 == 0) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                chartData[value.toInt()]['day'],
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            );
                          } else if (!_isMonthlyView) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                chartData[value.toInt()]['day'],
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            );
                          }
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      interval: 20,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          value.toInt().toString(),
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 11,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (chartData.length - 1).toDouble(),
                minY: 0,
                maxY: _getMaxY(chartData),
                lineBarsData: [
                  LineChartBarData(
                    spots: chartData.asMap().entries.map((entry) {
                      return FlSpot(
                        entry.key.toDouble(),
                        entry.value['weight'],
                      );
                    }).toList(),
                    isCurved: true,
                    color: const Color(0xFF4A90E2),
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        colors: [
                          const Color(0xFF4A90E2).withOpacity(0.3),
                          const Color(0xFF4A90E2).withOpacity(0.05),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleButton(String label, bool isActive) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isMonthlyView = label == 'Bulanan';
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Color(0xFF4A90E2) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isActive ? Colors.white : Colors.grey[600],
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getMonthlyData(CatchProvider provider) {
    final now = DateTime.now();
    List<Map<String, dynamic>> data = [];

    debugPrint('\n📈 [Chart] Generating monthly data (last 30 days)...');
    debugPrint('📈 [Chart] Total catches available: ${provider.catches.length}');

    for (int i = 29; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dayLabel = '${date.day}';

      // Hitung total berat tangkapan untuk hari ini
      final dayWeight = provider.catches
          .where((catch_) {
            final catchDate = catch_.departureDate;
            return catchDate.year == date.year &&
                catchDate.month == date.month &&
                catchDate.day == date.day;
          })
          .fold<double>(0, (sum, catch_) => sum + catch_.weight);

      if (dayWeight > 0) {
        debugPrint('📈 [Chart] Day ${date.day}: ${dayWeight}kg');
      }
      data.add({'day': dayLabel, 'weight': dayWeight});
    }

    final totalWeight = data.fold<double>(0, (sum, d) => sum + d['weight']);
    debugPrint('✅ [Chart] Monthly data: ${data.length} days, total weight: ${totalWeight.toStringAsFixed(1)} kg\n');

    return data;
  }

  List<Map<String, dynamic>> _getYearlyData(CatchProvider provider) {
    final now = DateTime.now();
    List<Map<String, dynamic>> data = [];
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    debugPrint('\n📈 [Chart] Generating yearly data (last 12 months)...');
    debugPrint('📈 [Chart] Total catches available: ${provider.catches.length}');

    for (int i = 11; i >= 0; i--) {
      // Hitung bulan yang benar dengan mengurangi dari bulan sekarang
      int targetYear = now.year;
      int targetMonth = now.month - i;
      
      // Jika bulan negatif, mundur ke tahun sebelumnya
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      
      final monthLabel = months[targetMonth - 1];

      // Hitung total berat tangkapan untuk bulan ini
      final monthWeight = provider.catches
          .where((catch_) {
            final catchDate = catch_.departureDate;
            return catchDate.year == targetYear &&
                catchDate.month == targetMonth;
          })
          .fold<double>(0, (sum, catch_) => sum + catch_.weight);

      if (monthWeight > 0) {
        debugPrint('📈 [Chart] $monthLabel $targetYear: ${monthWeight}kg');
      }
      data.add({'day': monthLabel, 'weight': monthWeight});
    }

    final totalWeight = data.fold<double>(0, (sum, d) => sum + d['weight']);
    debugPrint('✅ [Chart] Yearly data: ${data.length} months, total weight: ${totalWeight.toStringAsFixed(1)} kg\n');

    return data;
  }

  double _getMaxY(List<Map<String, dynamic>> data) {
    if (data.isEmpty) return 100;

    final maxWeight = data
        .map((d) => d['weight'] as double)
        .reduce((a, b) => a > b ? a : b);

    // Tambahkan padding 20% untuk tampilan yang lebih baik
    final maxY = maxWeight * 1.2;

    // Bulatkan ke kelipatan 20 terdekat
    return ((maxY / 20).ceil() * 20).toDouble();
  }

  Widget _buildRecentCatches() {
    final provider = Provider.of<CatchProvider>(context);
    final recentCatches = provider.catches.take(3).toList();
    final isTablet = ResponsiveHelper.isTablet(context);
    final screenWidth = MediaQuery.of(context).size.width;
    final titleSize = isTablet ? (screenWidth < 800 ? 14.0 : 16.0) : 18.0;
    final buttonSize = isTablet ? (screenWidth < 800 ? 11.0 : 12.0) : 14.0;
    final iconSize = isTablet ? (screenWidth < 800 ? 44.0 : 50.0) : 56.0;
    final fishNameSize = isTablet ? (screenWidth < 800 ? 13.0 : 14.0) : 15.0;
    final weightSize = isTablet ? (screenWidth < 800 ? 11.0 : 12.0) : 13.0;
    final emptyIconSize = isTablet ? (screenWidth < 800 ? 50.0 : 56.0) : 60.0;
    final emptyTextSize = isTablet ? (screenWidth < 800 ? 12.0 : 13.0) : 14.0;
    final cardPadding = isTablet ? (screenWidth < 800 ? 12.0 : 14.0) : 16.0;
    final cardMargin = isTablet ? (screenWidth < 800 ? 8.0 : 10.0) : 12.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Tangkapan Terbaru',
              style: TextStyle(
                fontSize: titleSize,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            TextButton(
              onPressed: () {
                // Switch ke tab History (index 1)
                Provider.of<NavigationProvider>(context, listen: false).setIndex(1);
              },
              child: Text(
                'Lihat Semua',
                style: TextStyle(
                  fontSize: buttonSize,
                  color: Color(0xFF4A90E2),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: isTablet ? 8 : 12),
        if (recentCatches.isEmpty)
          Center(
            child: Padding(
              padding: EdgeInsets.all(isTablet ? 24 : 32),
              child: Column(
                children: [
                  Icon(
                    Icons.inbox_outlined,
                    size: emptyIconSize,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Belum ada tangkapan',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: emptyTextSize,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ...recentCatches.map(
            (catch_) => Container(
              margin: EdgeInsets.only(bottom: cardMargin),
              padding: EdgeInsets.all(cardPadding),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(isTablet ? 12 : 16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: iconSize,
                    height: iconSize,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF4A90E2).withOpacity(0.2),
                          Color(0xFF4A90E2).withOpacity(0.1),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(isTablet ? 10 : 12),
                    ),
                    child: Icon(
                      Icons.phishing_rounded,
                      color: Color(0xFF4A90E2),
                      size: iconSize * 0.5,
                    ),
                  ),
                  SizedBox(width: isTablet ? 12 : 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          catch_.fishName,
                          style: TextStyle(
                            fontSize: fishNameSize,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${catch_.weight} kg',
                          style: TextStyle(
                            fontSize: weightSize,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: Colors.grey[400],
                    size: isTablet ? 20 : 24,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildDocumentAlert() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6B6B), Color(0xFFEE5A6F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.warning, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dokumen Pribadi Belum Lengkap!',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Lengkapi dokumen pribadi Anda',
                      style: TextStyle(fontSize: 14, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final userProvider = Provider.of<UserProvider>(
                  context,
                  listen: false,
                );
                final userRole = userProvider.user?.role ?? 'Crew';
                final route =
                    (userRole.toLowerCase() == 'nahkoda' ||
                        userRole.toLowerCase() == 'captain')
                    ? '/nahkoda-document-upload'
                    : '/crew-document-upload';
                await NavigationHelper.pushNamedNoTransition(context, route);
                // Refresh status setelah kembali
                if (mounted) await _checkDocumentCompletion();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.red,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text(
                'Lengkapi Sekarang',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRejectedAlert() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFB91C1C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.error_outline,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Dokumen Ditolak!',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$_rejectedCount dokumen perlu diupload ulang',
                      style: const TextStyle(fontSize: 14, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final userProvider = Provider.of<UserProvider>(
                  context,
                  listen: false,
                );
                final userRole = userProvider.user?.role ?? 'Crew';
                final route =
                    (userRole.toLowerCase() == 'nahkoda' ||
                        userRole.toLowerCase() == 'captain')
                    ? '/nahkoda-document-status'
                    : '/crew-document-status';
                await NavigationHelper.pushNamedNoTransition(context, route);
                // Refresh status setelah kembali
                if (mounted) await _checkDocumentCompletion();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Color(0xFFDC2626),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text(
                'Upload Ulang Dokumen',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFA726), Color(0xFFFB8C00)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 1500),
                tween: Tween(begin: 0.0, end: 1.0),
                builder: (context, value, child) {
                  return Transform.rotate(
                    angle: value * 2 * 3.14159,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(
                        Icons.hourglass_empty,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dokumen Sedang Diverifikasi',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Menunggu persetujuan admin',
                      style: TextStyle(fontSize: 14, color: Colors.white),
                    ),
                  ],
                ),
              ),
              TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 1000),
                tween: Tween(begin: 1.0, end: 1.2),
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: value,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.white.withOpacity(0.5),
                            blurRadius: 10,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.pending,
                        color: Color(0xFFFB8C00),
                        size: 16,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () async {
              final userProvider = Provider.of<UserProvider>(
                context,
                listen: false,
              );
              final userRole = userProvider.user?.role ?? 'Crew';
              final route =
                  (userRole.toLowerCase() == 'nahkoda' ||
                      userRole.toLowerCase() == 'captain')
                  ? '/nahkoda-document-status'
                  : '/crew-document-status';
              await NavigationHelper.pushNamedNoTransition(context, route);
              // Refresh status setelah kembali
              if (mounted) await _checkDocumentCompletion();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.orange,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.info_outline, size: 18),
                SizedBox(width: 8),
                Text(
                  'Lihat Detail',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabletStatisticsCards() {
    final provider = Provider.of<CatchProvider>(context);
    
    // TAMPILKAN SEMUA DATA tanpa filter
    final filteredCatches = provider.catches;
    
    debugPrint('📊 [Tablet Stats] Showing ALL: ${filteredCatches.length}');
    
    final totalWeight = filteredCatches.fold<double>(
      0,
      (sum, c) => sum + c.weight,
    );
    final totalRevenue = filteredCatches.fold<double>(
      0,
      (sum, c) => sum + c.totalRevenue,
    );
    final averageWeight = filteredCatches.isEmpty
        ? 0.0
        : totalWeight / filteredCatches.length;
    final screenWidth = MediaQuery.of(context).size.width;
    final cardSpacing = screenWidth < 800 ? 10.0 : 12.0;

    return Row(
      children: [
        Expanded(
          child: _buildCompactIconCard(
            icon: Icons.phishing_rounded,
            label: 'Tangkapan',
            value: '${filteredCatches.length}',
            subtitle: 'ikan',
            gradientColors: [Color(0xFF4A90E2), Color(0xFF357ABD)],
          ),
        ),
        SizedBox(width: cardSpacing),
        Expanded(
          child: _buildCompactIconCard(
            icon: Icons.scale_rounded,
            label: 'Berat',
            value: totalWeight.toStringAsFixed(1),
            subtitle: 'kg',
            gradientColors: [Color(0xFF5CB85C), Color(0xFF449D44)],
          ),
        ),
        SizedBox(width: cardSpacing),
        Expanded(
          child: _buildCompactIconCard(
            icon: Icons.payments_rounded,
            label: 'Pendapatan',
            value: 'Rp ${(totalRevenue / 1000).toStringAsFixed(0)}k',
            subtitle: '',
            gradientColors: [Color(0xFFF0AD4E), Color(0xFFEC971F)],
          ),
        ),
        SizedBox(width: cardSpacing),
        Expanded(
          child: _buildCompactIconCard(
            icon: Icons.trending_up_rounded,
            label: 'Rata-rata',
            value: averageWeight.toStringAsFixed(1),
            subtitle: 'kg/ikan',
            gradientColors: [Color(0xFF9B59B6), Color(0xFF8E44AD)],
          ),
        ),
      ],
    );
  }

  Widget _buildCompactIconCard({
    required IconData icon,
    required String label,
    required String value,
    required String subtitle,
    required List<Color> gradientColors,
  }) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardPadding = screenWidth < 800 ? 12.0 : 14.0;
    final iconSize = screenWidth < 800 ? 36.0 : 40.0;
    final iconSizeInner = screenWidth < 800 ? 20.0 : 22.0;
    final labelSize = screenWidth < 800 ? 11.0 : 12.0;
    final valueSize = screenWidth < 800 ? 18.0 : 20.0;
    final subtitleSize = screenWidth < 800 ? 10.0 : 11.0;
    final iconRadius = screenWidth < 800 ? 9.0 : 10.0;
    final cardRadius = screenWidth < 800 ? 12.0 : 14.0;

    return Container(
      padding: EdgeInsets.all(cardPadding),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(cardRadius),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: iconSize,
            height: iconSize,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(iconRadius),
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: iconSizeInner,
            ),
          ),
          SizedBox(height: screenWidth < 800 ? 8 : 10),
          Text(
            label,
            style: TextStyle(
              fontSize: labelSize,
              color: Colors.white.withOpacity(0.9),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: valueSize,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: subtitleSize,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactWeeklyActivity() {
    final provider = Provider.of<CatchProvider>(context);
    List<Map<String, dynamic>> chartData = _isMonthlyView 
        ? _getMonthlyData(provider) 
        : _getYearlyData(provider);
    final screenWidth = MediaQuery.of(context).size.width;
    final titleSize = screenWidth < 800 ? 14.0 : 16.0;
    final badgeSize = screenWidth < 800 ? 10.0 : 11.0;
    final subtitleSize = screenWidth < 800 ? 11.0 : 12.0;
    final chartHeight = screenWidth < 800 ? 140.0 : 160.0;
    final axisLabelSize = screenWidth < 800 ? 10.0 : 11.0;
    final reservedSizeBottom = screenWidth < 800 ? 22.0 : 24.0;
    final reservedSizeLeft = screenWidth < 800 ? 32.0 : 35.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Aktivitas Trip',
              style: TextStyle(
                fontSize: titleSize,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  _buildCompactToggleButton('Bulanan', _isMonthlyView, badgeSize),
                  _buildCompactToggleButton('Tahunan', !_isMonthlyView, badgeSize),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Berat total tangkapan (kg)',
          style: TextStyle(fontSize: subtitleSize, color: Colors.grey[600]),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: chartHeight,
          child: LineChart(
            LineChartData(
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: 20,
                getDrawingHorizontalLine: (value) {
                  return FlLine(color: Colors.grey[200]!, strokeWidth: 1);
                },
              ),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: reservedSizeBottom,
                    interval: _isMonthlyView ? 5 : 1,
                    getTitlesWidget: (value, meta) {
                      if (value.toInt() >= 0 && value.toInt() < chartData.length) {
                        if (_isMonthlyView && value.toInt() % 5 == 0) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              chartData[value.toInt()]['day'],
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: axisLabelSize,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          );
                        } else if (!_isMonthlyView) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              chartData[value.toInt()]['day'],
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: axisLabelSize,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          );
                        }
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: reservedSizeLeft,
                    interval: 20,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: axisLabelSize,
                        ),
                      );
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              minX: 0,
              maxX: (chartData.length - 1).toDouble(),
              minY: 0,
              maxY: _getMaxY(chartData),
              lineBarsData: [
                LineChartBarData(
                  spots: chartData.asMap().entries.map((entry) {
                    return FlSpot(entry.key.toDouble(), entry.value['weight']);
                  }).toList(),
                  isCurved: true,
                  color: const Color(0xFF4A90E2),
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF4A90E2).withOpacity(0.3),
                        const Color(0xFF4A90E2).withOpacity(0.05),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCompactToggleButton(String label, bool isActive, double fontSize) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isMonthlyView = label == 'Bulanan';
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isActive ? Color(0xFF4A90E2) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: fontSize,
            color: isActive ? Colors.white : Colors.grey[600],
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
