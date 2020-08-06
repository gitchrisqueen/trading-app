#docker run --rm -v ${PWD}:/local swaggerapi/swagger-codegen-cli-v3 config-help -l javascript

docker run --rm -v ${PWD}/swagger:/local swaggerapi/swagger-codegen-cli-v3 generate \
              -l javascript \
              -i https://raw.githubusercontent.com/gitchrisqueen/tdameritrade-api/swaggerhub/nodejs-server/api/openapi.yaml \
              -D '{"specURL":"https://raw.githubusercontent.com/gitchrisqueen/tdameritrade-api/swaggerhub/nodejs-server/api/openapi.yaml","lang":"javascript","type":"CLIENT","codegenVersion":"V3","options":{"additionalProperties":{"sortParamsByRequiredFlag":true,"projectName":"js-client","usePromises":"true","modelPropertyNaming":"PascalCase"}}}' \
              -o ./local
#
#

