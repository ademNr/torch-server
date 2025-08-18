const { Model, DataTypes } = require('sequelize');

class ProfileImage extends Model {
    static init(sequelize) {
        super.init({
            // Change this line:
            url: DataTypes.TEXT, // Was DataTypes.STRING

            signature: DataTypes.JSONB
        }, {
            sequelize,
            modelName: 'ProfileImage',
            timestamps: false
        });
    }

    static associate(models) {
        this.belongsTo(models.Profile, {
            foreignKey: 'profileId',
            as: 'profile'
        });
    }
}

module.exports = ProfileImage;