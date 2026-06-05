class DocumentRequirementModel {
  final String id;
  final String userId;
  final String userRole; // 'nahkoda' or 'crew'
  final String title;
  final String description;
  final List<DocumentItem> requiredDocuments;
  final DateTime createdAt;
  final DateTime? dueDate;
  final bool isCompleted;
  final bool isUrgent;

  DocumentRequirementModel({
    required this.id,
    required this.userId,
    required this.userRole,
    required this.title,
    required this.description,
    required this.requiredDocuments,
    required this.createdAt,
    this.dueDate,
    this.isCompleted = false,
    this.isUrgent = false,
  });

  factory DocumentRequirementModel.fromJson(Map<String, dynamic> json) {
    return DocumentRequirementModel(
      id: json['id'],
      userId: json['user_id'],
      userRole: json['user_role'],
      title: json['title'],
      description: json['description'],
      requiredDocuments: (json['required_documents'] as List)
          .map((doc) => DocumentItem.fromJson(doc))
          .toList(),
      createdAt: DateTime.parse(json['created_at']),
      dueDate: json['due_date'] != null ? DateTime.parse(json['due_date']) : null,
      isCompleted: json['is_completed'] ?? false,
      isUrgent: json['is_urgent'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'user_role': userRole,
      'title': title,
      'description': description,
      'required_documents': requiredDocuments.map((doc) => doc.toJson()).toList(),
      'created_at': createdAt.toIso8601String(),
      'due_date': dueDate?.toIso8601String(),
      'is_completed': isCompleted,
      'is_urgent': isUrgent,
    };
  }

  double get completionPercentage {
    if (requiredDocuments.isEmpty) return 0.0;
    final completedCount = requiredDocuments.where((doc) => doc.isUploaded).length;
    return completedCount / requiredDocuments.length;
  }
}

class DocumentItem {
  final String name;
  final String description;
  final bool isRequired;
  final bool isUploaded;
  final String? filePath;
  final DateTime? uploadedAt;

  DocumentItem({
    required this.name,
    required this.description,
    this.isRequired = true,
    this.isUploaded = false,
    this.filePath,
    this.uploadedAt,
  });

  factory DocumentItem.fromJson(Map<String, dynamic> json) {
    return DocumentItem(
      name: json['name'],
      description: json['description'],
      isRequired: json['is_required'] ?? true,
      isUploaded: json['is_uploaded'] ?? false,
      filePath: json['file_path'],
      uploadedAt: json['uploaded_at'] != null 
          ? DateTime.parse(json['uploaded_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'is_required': isRequired,
      'is_uploaded': isUploaded,
      'file_path': filePath,
      'uploaded_at': uploadedAt?.toIso8601String(),
    };
  }
}