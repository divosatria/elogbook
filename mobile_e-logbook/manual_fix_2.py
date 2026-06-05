import os

def replace_in_file(path, old_text, new_text):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"Text not found in {path}")

# 11. notification_screen.dart
replace_in_file(
    'lib/screens/notification_screen.dart',
    '''    await _updateUnreadCounts();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Semua notifikasi telah ditandai dibaca'),
        backgroundColor: Colors.green,
      ),
    );''',
    '''    if (!mounted) return;
    await _updateUnreadCounts();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Semua notifikasi telah ditandai dibaca'),
        backgroundColor: Colors.green,
      ),
    );'''
)
replace_in_file(
    'lib/screens/notification_screen.dart',
    '''                  await _updateUnreadCounts();
                  NavigationHelper.pushNamedNoTransition(
                    context,
                    '/notification-detail',
                    arguments: notification,
                  );''',
    '''                  if (!mounted) return;
                  await _updateUnreadCounts();
                  NavigationHelper.pushNamedNoTransition(
                    context,
                    '/notification-detail',
                    arguments: notification,
                  );'''
)
replace_in_file(
    'lib/screens/notification_screen.dart',
    '''                  if (_documentRequirements.isNotEmpty) {
                    NavigationHelper.pushNamedNoTransition(
                      context,
                      '/nahkoda-document-upload',
                    );
                  }''',
    '''                  if (!mounted) return;
                  if (_documentRequirements.isNotEmpty) {
                    NavigationHelper.pushNamedNoTransition(
                      context,
                      '/nahkoda-document-upload',
                    );
                  }'''
)

# 12. profile_screen.dart
replace_in_file(
    'lib/screens/profile_screen.dart',
    '''    if (shouldLogout == true) {
      // Reset navigation ke home screen
      Provider.of<NavigationProvider>(context, listen: false).resetToHome();''',
    '''    if (shouldLogout == true) {
      if (!mounted) return;
      // Reset navigation ke home screen
      Provider.of<NavigationProvider>(context, listen: false).resetToHome();'''
)

# 13. trip_info_screen.dart
replace_in_file(
    'lib/screens/schedules/trip_info_screen.dart',
    '''    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );''',
    '''    if (!mounted) return;
    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );'''
)

# 14. account_info_screen.dart
replace_in_file(
    'lib/screens/settings/account_info_screen.dart',
    '''        if (profileResult['success'] == true && profileResult['user'] != null) {
          Provider.of<UserProvider>(context, listen: false).setUser(profileResult['user']);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alamat berhasil diperbarui'), backgroundColor: Colors.green),
        );''',
    '''        if (!mounted) return;
        if (profileResult['success'] == true && profileResult['user'] != null) {
          Provider.of<UserProvider>(context, listen: false).setUser(profileResult['user']);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alamat berhasil diperbarui'), backgroundColor: Colors.green),
        );'''
)

# 15. pre_trip_form.dart
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''    if (result != null && result is Map<String, dynamic>) {
      setState(() => _fuelData = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Data bahan bakar tersimpan'),
          backgroundColor: Colors.green,
        ),
      );
    }''',
    '''    if (!mounted) return;
    if (result != null && result is Map<String, dynamic>) {
      setState(() => _fuelData = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Data bahan bakar tersimpan'),
          backgroundColor: Colors.green,
        ),
      );
    }'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''    if (result != null && result is Map<String, dynamic>) {
      setState(() => _iceData = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Data es tersimpan'),
          backgroundColor: Colors.green,
        ),
      );
    }''',
    '''    if (!mounted) return;
    if (result != null && result is Map<String, dynamic>) {
      setState(() => _iceData = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Data es tersimpan'),
          backgroundColor: Colors.green,
        ),
      );
    }'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''        final file = result.files.single;
        if (file.size > 10 * 1024 * 1024) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Ukuran file maksimal 10MB'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }''',
    '''        if (!mounted) return;
        final file = result.files.single;
        if (file.size > 10 * 1024 * 1024) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Ukuran file maksimal 10MB'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memilih dokumen'),
          backgroundColor: Colors.red,
        ),
      );
    }''',
    '''      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memilih dokumen'),
          backgroundColor: Colors.red,
        ),
      );
    }'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Data crew berhasil diperbarui'),
        backgroundColor: Colors.green,
      ),
    );''',
    '''    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Data crew berhasil diperbarui'),
        backgroundColor: Colors.green,
      ),
    );'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Dokumen berhasil diupload'),
          backgroundColor: Colors.green,
        ),
      );''',
    '''      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Dokumen berhasil diupload'),
          backgroundColor: Colors.green,
        ),
      );'''
)
replace_in_file(
    'lib/screens/tracking/pre_trip_form.dart',
    '''    } catch (e) {
      print('❌ Error uploading crew data: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengupload dokumen: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }''',
    '''    } catch (e) {
      print('❌ Error uploading crew data: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengupload dokumen: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }'''
)

# 16. upload_fuel_screen.dart
replace_in_file(
    'lib/screens/tracking/upload_fuel_screen.dart',
    '''      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil foto'), backgroundColor: Colors.red),
      );
    }''',
    '''      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil foto'), backgroundColor: Colors.red),
      );
    }'''
)
replace_in_file(
    'lib/screens/tracking/upload_fuel_screen.dart',
    '''      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memilih foto'), backgroundColor: Colors.red),
      );
    }''',
    '''      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memilih foto'), backgroundColor: Colors.red),
      );
    }'''
)

# 17. upload_ice_screen.dart
replace_in_file(
    'lib/screens/tracking/upload_ice_screen.dart',
    '''      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil foto'), backgroundColor: Colors.red),
      );
    }''',
    '''      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil foto'), backgroundColor: Colors.red),
      );
    }'''
)
replace_in_file(
    'lib/screens/tracking/upload_ice_screen.dart',
    '''      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memilih foto'), backgroundColor: Colors.red),
      );
    }''',
    '''      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memilih foto'), backgroundColor: Colors.red),
      );
    }'''
)

print("Done phase 2")
