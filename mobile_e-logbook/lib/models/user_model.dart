class UserModel {
  final int id;
  final String name;
  final String? username;
  final String email;
  final String phone;
  final String? address;
  final String? token;
  final String? vesselName;
  final String? vesselNumber;
  final String? captainName;
  final int? crewCount;
  final List<String>? crewNames;
  final String? role; // 'Nahkoda' or 'ABK'
  final String? profilePicture;
  final bool isActive;
  final String? lastLoginAt;

  UserModel({
    required this.id,
    required this.name,
    this.username,
    required this.email,
    required this.phone,
    this.address,
    this.token,
    this.vesselName,
    this.vesselNumber,
    this.captainName,
    this.crewCount,
    this.crewNames,
    this.role = 'Nahkoda', // Default role
    this.profilePicture,
    this.isActive = true,
    this.lastLoginAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name'],
      username: json['username'],
      email: json['email'],
      phone: json['phone'],
      address: json['address'] ?? json['alamat'],
      token: json['token'],
      vesselName: json['vessel_name'],
      vesselNumber: json['vessel_number'],
      captainName: json['captain_name'],
      crewCount: json['crew_count'] is int ? json['crew_count'] : (json['crew_count'] != null ? int.tryParse(json['crew_count'].toString()) : null),
      crewNames: json['crew_names'] != null
          ? List<String>.from(json['crew_names'])
          : null,
      role: json['role'] ?? 'Nahkoda',
      profilePicture: json['profile_picture'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      lastLoginAt: json['lastLoginAt'] ?? json['last_login_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'email': email,
      'phone': phone,
      'address': address,
      'token': token,
      'vessel_name': vesselName,
      'vessel_number': vesselNumber,
      'captain_name': captainName,
      'crew_count': crewCount,
      'crew_names': crewNames,
      'role': role,
      'profile_picture': profilePicture,
      'isActive': isActive,
      'lastLoginAt': lastLoginAt,
    };
  }

  UserModel copyWith({
    int? id,
    String? name,
    String? username,
    String? email,
    String? phone,
    String? address,
    String? token,
    String? vesselName,
    String? vesselNumber,
    String? captainName,
    int? crewCount,
    List<String>? crewNames,
    String? role,
    String? profilePicture,
    bool? isActive,
    String? lastLoginAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      username: username ?? this.username,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      token: token ?? this.token,
      vesselName: vesselName ?? this.vesselName,
      vesselNumber: vesselNumber ?? this.vesselNumber,
      captainName: captainName ?? this.captainName,
      crewCount: crewCount ?? this.crewCount,
      crewNames: crewNames ?? this.crewNames,
      role: role ?? this.role,
      profilePicture: profilePicture ?? this.profilePicture,
      isActive: isActive ?? this.isActive,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    );
  }

  bool get isNahkoda => (role ?? 'Nahkoda') == 'Nahkoda';
  bool get isABK => (role ?? 'Crew') == 'Crew' || (role ?? 'Crew') == 'ABK';
}
