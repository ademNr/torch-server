const { Model, DataTypes } = require('sequelize');

class Profile extends Model {
    static init(sequelize) {
        super.init({
            name: DataTypes.STRING,
            age: DataTypes.INTEGER,
            distance: DataTypes.INTEGER,
            tinderId: {
                type: DataTypes.STRING,
                unique: true // Add unique constraint
            },
            scrapedAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        }, {
            sequelize,
            modelName: 'Profile',
            timestamps: false,
            indexes: [
                {
                    unique: true,
                    fields: ['tinderId'] // Ensure database-level uniqueness
                }
            ]
        });
    }

    static associate(models) {
        this.hasMany(models.ProfileImage, {
            foreignKey: 'profileId',
            as: 'images'
        });
    }
}

module.exports = Profile;